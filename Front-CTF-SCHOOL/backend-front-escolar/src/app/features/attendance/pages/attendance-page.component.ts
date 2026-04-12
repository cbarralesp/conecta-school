import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import {
  AttendanceCatalog,
  DailyAttendanceStudent,
  DailyAttendanceView,
  MonthlyAttendanceView,
  WeeklyAttendanceView
} from '../../../core/models/attendance.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

type AttendanceTab = 'daily' | 'weekly' | 'monthly';
type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'ATRASADO' | 'SIN_MARCAR';

class MondayFirstDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }
}

@Component({
  selector: 'app-attendance-page',
  imports: [
    NgClass,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    TeacherSideMenuComponent
  ],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' },
    { provide: DateAdapter, useClass: MondayFirstDateAdapter }
  ]
})
export class AttendancePageComponent {
  @ViewChild('monthlyPdfReport') private monthlyPdfRef?: ElementRef<HTMLElement>;

  private readonly attendanceApiService = inject(AttendanceApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly activeTab = signal<AttendanceTab>('daily');
  readonly catalog = signal<AttendanceCatalog | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedDate = signal(this.toIsoDate(new Date()));
  readonly selectedWeekStart = signal(this.toIsoDate(this.startOfWeek(new Date())));
  readonly selectedMonth = signal(this.toYearMonth(new Date()));
  readonly dailyView = signal<DailyAttendanceView | null>(null);
  readonly weeklyView = signal<WeeklyAttendanceView | null>(null);
  readonly monthlyView = signal<MonthlyAttendanceView | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);

  readonly orderedCourses = computed(() => this.catalog()?.courses ?? []);
  readonly selectedCourse = computed(
    () => this.orderedCourses().find((course) => course.id === this.selectedCourseId()) ?? null
  );
  readonly dailyCounters = computed(() => ({
    total: this.dailyView()?.totalStudents ?? 0,
    present: this.dailyView()?.presentCount ?? 0,
    absent: this.dailyView()?.absentCount ?? 0,
    late: this.dailyView()?.lateCount ?? 0
  }));

  constructor() {
    this.loadCatalog();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  setTab(tab: AttendanceTab): void {
    this.activeTab.set(tab);
    this.loadActiveView();
  }

  updateCourse(courseId: number | null): void {
    this.selectedCourseId.set(courseId);
    if (!courseId) {
      this.dailyView.set(null);
      this.weeklyView.set(null);
      this.monthlyView.set(null);
      return;
    }

    // Keep the roster ready for the daily pass even when the user is browsing
    // weekly or monthly summaries.
    this.loadDailyView();

    if (this.activeTab() === 'weekly') {
      this.loadWeeklyView();
      return;
    }

    if (this.activeTab() === 'monthly') {
      this.loadMonthlyView();
    }
  }

  updateDate(value: string): void {
    this.selectedDate.set(value);
    this.loadDailyView();
  }

  updateDateFromPicker(value: Date | null): void {
    if (!value) {
      return;
    }
    this.updateDate(this.toIsoDate(value));
  }

  updateWeekStart(value: string): void {
    this.selectedWeekStart.set(value);
    this.loadWeeklyView();
  }

  updateMonth(value: string): void {
    this.selectedMonth.set(value);
    this.loadMonthlyView();
  }

  setStudentStatus(studentId: number, status: AttendanceStatus): void {
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              status,
              arrivalTime:
                status === 'ATRASADO'
                  ? student.arrivalTime || this.defaultArrivalTime()
                  : null
            }
          : student
      );

      return this.recalculateDaily(current, students);
    });
  }

  updateArrivalTime(studentId: number, value: string): void {
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) =>
        student.studentId === studentId ? { ...student, arrivalTime: value || null } : student
      );

      return { ...current, students };
    });
  }

  markAll(status: AttendanceStatus): void {
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) => ({
        ...student,
        status,
        arrivalTime: status === 'ATRASADO' ? student.arrivalTime || this.defaultArrivalTime() : null
      }));

      return this.recalculateDaily(current, students);
    });
  }

  saveDailyAttendance(): void {
    const current = this.dailyView();
    const courseId = this.selectedCourseId();
    if (!current || !courseId || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.attendanceApiService
      .saveDaily({
        courseId,
        date: this.selectedDate(),
        entries: current.students.map((student) => ({
          studentId: student.studentId,
          status: student.status,
          arrivalTime: student.arrivalTime,
          note: student.note
        }))
      })
      .subscribe({
        next: (view) => {
          this.dailyView.set(view);
          this.isSaving.set(false);
          this.snackBar.open('Asistencia guardada correctamente', 'Cerrar', { duration: 2600 });
          this.loadWeeklyView();
          this.loadMonthlyView();
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.showError(error, 'No fue posible guardar la asistencia');
        }
      });
  }

  async exportMonthlyReport(): Promise<void> {
    const monthly = this.monthlyView();
    const exportTarget = this.monthlyPdfRef?.nativeElement;
    if (!monthly || !exportTarget || this.isExporting()) {
      return;
    }

    try {
      this.isExporting.set(true);
      const canvas = await html2canvas(exportTarget, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const scale = Math.min(printableWidth / canvas.width, printableHeight / canvas.height);
      const width = canvas.width * scale;
      const height = canvas.height * scale;
      const x = (pageWidth - width) / 2;
      const y = margin;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height, undefined, 'FAST');
      pdf.save(`asistencia-${this.selectedMonth()}-${(this.selectedCourse()?.name ?? 'curso').replaceAll(' ', '-').toLowerCase()}.pdf`);
      this.snackBar.open('Reporte mensual descargado', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible exportar el reporte mensual', 'Cerrar', { duration: 3200 });
    } finally {
      this.isExporting.set(false);
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PRESENTE':
        return 'Presente';
      case 'AUSENTE':
        return 'Ausente';
      case 'ATRASADO':
        return 'Atrasado';
      default:
        return 'Sin marcar';
    }
  }

  badgeClass(status: string): string {
    switch (status) {
      case 'PRESENTE':
      case 'NORMAL':
        return 'is-success';
      case 'AUSENTE':
      case 'CRITICO':
      case 'RIESGO':
        return 'is-danger';
      default:
        return 'is-warning';
    }
  }

  dotClass(status: string): string {
    switch (status) {
      case 'PRESENTE':
        return 'dot-success';
      case 'AUSENTE':
        return 'dot-danger';
      case 'ATRASADO':
        return 'dot-warning';
      default:
        return 'dot-empty';
    }
  }

  initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value[0])
      .join('')
      .toUpperCase();
  }

  trackStudent(index: number, student: { studentId: number }): number {
    return student.studentId;
  }

  selectedDateAsDate(): Date | null {
    const value = this.selectedDate();
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  private loadCatalog(): void {
    this.isLoading.set(true);
    this.attendanceApiService.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.selectedCourseId.set(catalog.courses[0]?.id ?? null);
        this.isLoading.set(false);
        this.loadActiveView();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el catalogo de asistencia');
      }
    });
  }

  private loadActiveView(): void {
    switch (this.activeTab()) {
      case 'daily':
        this.loadDailyView();
        break;
      case 'weekly':
        this.loadWeeklyView();
        break;
      case 'monthly':
        this.loadMonthlyView();
        break;
    }
  }

  private loadDailyView(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      return;
    }
    this.isLoading.set(true);
    this.attendanceApiService.getDaily(courseId, this.selectedDate()).subscribe({
      next: (view) => {
        this.dailyView.set(view);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el pase de lista');
      }
    });
  }

  private loadWeeklyView(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      return;
    }
    this.isLoading.set(true);
    this.attendanceApiService.getWeekly(courseId, this.selectedWeekStart()).subscribe({
      next: (view) => {
        this.weeklyView.set(view);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la asistencia semanal');
      }
    });
  }

  private loadMonthlyView(): void {
    const courseId = this.selectedCourseId();
    if (!courseId) {
      return;
    }
    this.isLoading.set(true);
    this.attendanceApiService.getMonthly(courseId, this.selectedMonth()).subscribe({
      next: (view) => {
        this.monthlyView.set(view);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el resumen mensual');
      }
    });
  }

  private recalculateDaily(view: DailyAttendanceView, students: DailyAttendanceStudent[]): DailyAttendanceView {
    return {
      ...view,
      students,
      presentCount: students.filter((student) => student.status === 'PRESENTE').length,
      absentCount: students.filter((student) => student.status === 'AUSENTE').length,
      lateCount: students.filter((student) => student.status === 'ATRASADO').length
    };
  }

  private defaultArrivalTime(): string {
    return '08:40';
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(
      typeof error.error?.message === 'string' ? error.error.message : fallback,
      'Cerrar',
      { duration: 3500 }
    );
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return copy;
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }
}
