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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import {
  AttendanceCatalog,
  DailyAttendanceStudent,
  DailyAttendanceView,
  MonthlyAttendanceStudent,
  MonthlyAttendanceView,
  WeeklyAttendanceView
} from '../../../core/models/attendance.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type AttendanceTab = 'daily' | 'weekly' | 'monthly';
type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'ATRASADO' | 'SIN_MARCAR';
type MonthlySelection = 'all' | number;

interface MonthlyCalendarCell {
  kind: 'empty' | 'day';
  date?: string;
  dayNumber?: number;
  isWeekend?: boolean;
  isFuture?: boolean;
  isToday?: boolean;
  globalPercentage?: number | null;
  individualStatus?: string | null;
}

interface AttendanceNoteDialogState {
  studentId: number;
  studentName: string;
  note: string;
}

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
    MatSnackBarModule,
    TeacherModernLayoutComponent
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

  readonly user = this.authStateService.user;
  readonly activeTab = signal<AttendanceTab>('daily');
  readonly dailySearch = signal('');
  readonly noteDialog = signal<AttendanceNoteDialogState | null>(null);
  readonly monthlySearch = signal('');
  readonly selectedMonthlyStudentId = signal<MonthlySelection>('all');
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
  readonly filteredDailyStudents = computed(() => {
    const query = this.dailySearch().trim().toLowerCase();
    const students = this.dailyView()?.students ?? [];
    if (!query) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(query) || student.run.toLowerCase().includes(query)
    );
  });
  readonly dailyProgress = computed(() => {
    return {
      marked: this.dailyView()?.summary.markedCount ?? 0,
      total: this.dailyCounters().total,
      percent: this.dailyView()?.summary.progressPercent ?? 0
    };
  });
  readonly dailyPercentages = computed(() => {
    return {
      present: this.dailyView()?.summary.presentPercentage ?? 0,
      absent: this.dailyView()?.summary.absentPercentage ?? 0,
      late: this.dailyView()?.summary.latePercentage ?? 0
    };
  });
  readonly weeklySummary = computed(() => {
    return {
      average: this.weeklyView()?.summary.averageAttendance ?? 0,
      absences: this.weeklyView()?.summary.totalAbsences ?? 0,
      late: this.weeklyView()?.summary.totalLate ?? 0,
      alerts: this.weeklyView()?.summary.activeAlerts ?? 0
    };
  });
  readonly monthlyDistribution = computed(() => {
    return (
      this.monthlyView()?.distribution ?? {
        presentCount: 0,
        presentPercentage: 0,
        absentCount: 0,
        absentPercentage: 0,
        lateCount: 0,
        latePercentage: 0
      }
    );
  });
  readonly monthlyDailySummary = computed(() => this.monthlyView()?.dailySummary ?? []);
  readonly filteredMonthlyStudents = computed(() => {
    const query = this.monthlySearch().trim().toLowerCase();
    const students = this.monthlyView()?.students ?? [];
    if (!query) {
      return students;
    }

    return students.filter((student) =>
      student.fullName.toLowerCase().includes(query) || student.run.toLowerCase().includes(query)
    );
  });
  readonly selectedMonthlyStudent = computed(() => {
    const selected = this.selectedMonthlyStudentId();
    if (selected === 'all') {
      return null;
    }
    return this.monthlyView()?.students.find((student) => student.studentId === selected) ?? null;
  });
  readonly monthlyCalendarCells = computed<MonthlyCalendarCell[]>(() => {
    const month = this.selectedMonth();
    if (!month) {
      return [];
    }

    const [year, monthNumber] = month.split('-').map(Number);
    if (!year || !monthNumber) {
      return [];
    }

    const firstDay = new Date(year, monthNumber - 1, 1);
    const lastDay = new Date(year, monthNumber, 0);
    const offset = (firstDay.getDay() + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: MonthlyCalendarCell[] = [];
    for (let index = 0; index < offset; index++) {
      cells.push({ kind: 'empty' });
    }

    const daySummary = new Map(
      this.monthlyDailySummary().map((day) => [Number(day.dayLabel), day.attendancePercentage])
    );
    const selectedStudentDays = new Map(
      (this.selectedMonthlyStudent()?.days ?? []).map((day) => [day.date, day.status])
    );

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const current = new Date(year, monthNumber - 1, day);
      current.setHours(0, 0, 0, 0);
      const iso = this.toIsoDate(current);
      const weekend = current.getDay() === 0 || current.getDay() === 6;
      const isFuture = current.getTime() > today.getTime();
      const isToday = current.getTime() === today.getTime();

      cells.push({
        kind: 'day',
        date: iso,
        dayNumber: day,
        isWeekend: weekend,
        isFuture,
        isToday,
        globalPercentage: daySummary.get(day) ?? null,
        individualStatus: selectedStudentDays.get(iso) ?? null
      });
    }

    return cells;
  });
  readonly monthlyCalendarTitle = computed(() => {
    const selectedStudent = this.selectedMonthlyStudent();
    return selectedStudent ? selectedStudent.fullName : this.monthlyView()?.monthLabel ?? 'Resumen mensual';
  });
  readonly monthlyCalendarSubtitle = computed(() => {
    return this.selectedMonthlyStudent()
      ? 'Historial individual de asistencia'
      : 'Promedio de asistencia por día';
  });
  readonly monthlyStudentSummary = computed(() => {
    const student = this.selectedMonthlyStudent();
    if (!student) {
      return {
        present: this.monthlyDistribution().presentCount,
        absent: this.monthlyDistribution().absentCount,
        late: this.monthlyDistribution().lateCount,
        percentage: this.monthlyView()?.averageAttendance ?? 0
      };
    }

    return {
      present: student.presentCount,
      absent: student.absentCount,
      late: student.lateCount,
      percentage: Math.min(100, student.presentPercentage + student.latePercentage)
    };
  });

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
    this.selectedMonthlyStudentId.set('all');
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
    this.selectedMonthlyStudentId.set('all');
    this.loadMonthlyView();
  }

  updateDailySearch(value: string): void {
    this.dailySearch.set(value);
  }

  updateMonthlySearch(value: string): void {
    this.monthlySearch.set(value);
  }

  selectMonthlyStudent(studentId: MonthlySelection): void {
    this.selectedMonthlyStudentId.set(studentId);
  }

  updateStudentNote(studentId: number, value: string): void {
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) =>
        student.studentId === studentId ? { ...student, note: value || null } : student
      );

      return { ...current, students };
    });
  }

  openStudentNote(student: DailyAttendanceStudent): void {
    this.noteDialog.set({
      studentId: student.studentId,
      studentName: student.fullName,
      note: student.note ?? ''
    });
  }

  updateNoteDraft(value: string): void {
    this.noteDialog.update((current) => (current ? { ...current, note: value } : current));
  }

  closeStudentNote(): void {
    this.noteDialog.set(null);
  }

  saveStudentNote(): void {
    const dialog = this.noteDialog();
    if (!dialog) {
      return;
    }

    this.updateStudentNote(dialog.studentId, dialog.note.trim());
    this.closeStudentNote();
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

  resetDailyAttendance(): void {
    this.dailyView.update((current) => {
      if (!current) {
        return current;
      }

      const students = current.students.map((student) => ({
        ...student,
        status: 'SIN_MARCAR',
        arrivalTime: null
      }));

      return this.recalculateDaily(current, students);
    });
  }

  moveDay(direction: -1 | 1): void {
    const current = this.selectedDateAsDate();
    if (!current) {
      return;
    }

    const next = new Date(current);
    next.setDate(next.getDate() + direction);
    this.updateDate(this.toIsoDate(next));
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
      const studentToken = this.monthlySearch().trim()
        ? `-${this.monthlySearch()
            .trim()
            .toLowerCase()
            .replaceAll(' ', '-')}`
        : '';
      pdf.save(
        `asistencia-${this.selectedMonth()}-${(this.selectedCourse()?.name ?? 'curso').replaceAll(' ', '-').toLowerCase()}${studentToken}.pdf`
      );
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

  monthlyBarClass(percentage: number): string {
    if (percentage >= 80) {
      return 'is-success';
    }

    if (percentage >= 60) {
      return 'is-warning';
    }

    return 'is-danger';
  }

  monthlyPercentageClass(percentage: number): string {
    if (percentage >= 80) {
      return 'text-success';
    }

    if (percentage >= 60) {
      return 'text-warning';
    }

    return 'text-danger';
  }

  monthlyDistributionLabel(): string {
    return this.monthlySearch().trim() ? 'Distribución del estudiante' : 'Distribución del mes';
  }

  monthlyCalendarClass(percentage: number): string {
    return percentage >= 80 ? 'is-success' : 'is-danger';
  }

  monthlyOverallPercentage(student: MonthlyAttendanceStudent): number {
    return Math.min(100, student.presentPercentage + student.latePercentage);
  }

  monthlyCellClass(cell: MonthlyCalendarCell): string {
    if (cell.kind !== 'day') {
      return 'is-empty';
    }

    if (cell.isWeekend) {
      return 'is-weekend';
    }

    if (cell.isFuture) {
      return 'is-future';
    }

    const selectedStudent = this.selectedMonthlyStudent();
    if (!selectedStudent) {
      const percentage = cell.globalPercentage;
      if (percentage == null) {
        return 'is-none';
      }
      if (percentage >= 80) {
        return 'is-global-good';
      }
      if (percentage >= 60) {
        return 'is-global-mid';
      }
      return 'is-global-bad';
    }

    switch (cell.individualStatus) {
      case 'PRESENTE':
        return 'is-present';
      case 'AUSENTE':
        return 'is-absent';
      case 'ATRASADO':
        return 'is-late';
      default:
        return 'is-none';
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
    const presentCount = students.filter((student) => student.status === 'PRESENTE').length;
    const absentCount = students.filter((student) => student.status === 'AUSENTE').length;
    const lateCount = students.filter((student) => student.status === 'ATRASADO').length;
    const totalStudents = students.length;
    const markedCount = presentCount + absentCount + lateCount;

    return {
      ...view,
      students,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      summary: {
        markedCount,
        progressPercent: totalStudents > 0 ? Math.round((markedCount / totalStudents) * 100) : 0,
        presentPercentage: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
        absentPercentage: totalStudents > 0 ? Math.round((absentCount / totalStudents) * 100) : 0,
        latePercentage: totalStudents > 0 ? Math.round((lateCount / totalStudents) * 100) : 0
      }
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
