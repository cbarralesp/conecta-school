import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { Course } from '../../../core/models/course.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import { ActivityCalendarApiService } from '../../../core/services/activity-calendar-api.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import {
  ActivityCalendar,
  ActivityCalendarDay,
  CreateSchoolActivityRequest,
  SchoolActivity
} from '../../../core/models/activity-calendar.models';
import { ActivityDialogComponent } from '../components/activity-dialog.component';

interface ActivityStats {
  total: number;
  thisMonth: number;
  upcoming: number;
  completed: number;
}

interface SelectedActivityItem {
  id: number;
  title: string;
  typeLabel: string;
  colorHex: string;
  dateStr: string;
  shortDate: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'DONE';
  activity: SchoolActivity;
}

@Component({
  selector: 'app-activities-calendar-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './activities-calendar-page.component.html',
  styleUrl: './activities-calendar-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivitiesCalendarPageComponent {
  @ViewChild('pdfCalendar') private pdfCalendarRef?: ElementRef<HTMLElement>;
  @ViewChild('monthDetailDialog') private monthDetailDialogRef?: TemplateRef<unknown>;

  private readonly authStateService = inject(AuthStateService);
  private readonly activityCalendarApiService = inject(ActivityCalendarApiService);
  private readonly courseApiService = inject(CourseApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly today = new Date();

  readonly isLoading = signal(false);
  readonly isExportingPdf = signal(false);
  readonly isExportingJson = signal(false);
  readonly calendar = signal<ActivityCalendar | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly selectedCourseId = signal<number | null>(null);
  readonly visibleYear = signal(this.today.getFullYear());
  readonly visibleMonth = signal(this.today.getMonth() + 1);
  readonly isReadOnly = signal(false);
  readonly selectedDate = signal(this.toIsoDate(this.today));
  readonly user = this.authStateService.user;
  readonly pageTitle = computed(() => (this.isReadOnly() ? 'Actividades mensuales' : 'Calendario de actividades'));
  readonly pageDescription = computed(() =>
    this.isReadOnly()
      ? 'Consulta el calendario mensual del establecimiento y revisa las actividades publicadas para ti en modo solo lectura.'
      : 'Visualiza y administra las actividades, feriados y eventos del año escolar 2026.'
  );

  readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly monthLabel = computed(() => this.calendar()?.monthLabel ?? 'Cargando...');
  readonly selectedCourseName = computed(() => {
    const selectedCourseId = this.selectedCourseId();
    if (!selectedCourseId) {
      return 'Todos los cursos';
    }
    const course = this.courses().find((item) => item.id === selectedCourseId);
    return course ? this.formatCourseLabel(course) : 'Curso';
  });
  readonly stats = computed<ActivityStats>(() => {
    const calendar = this.calendar();
    if (!calendar) {
      return { total: 0, thisMonth: 0, upcoming: 0, completed: 0 };
    }
    return calendar.summary;
  });

  readonly calendarDays = computed<ActivityCalendarDay[]>(() => this.calendar()?.days ?? []);

  readonly monthGrid = computed(() => {
    const days = this.calendarDays();
    return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
  });
  readonly calendarCells = computed(() =>
    this.calendarDays().map((day) => ({
      dateStr: day.isoDate,
      day: day.dayOfMonth,
      isBlank: false,
      isToday: day.today,
      isSelected: this.selectedDate() === day.isoDate,
      isOtherMonth: !day.inCurrentMonth,
      dotColors: day.activities.slice(0, 3).map((activity) => activity.backgroundColor)
    }))
  );

  readonly selectedDayActivities = computed<SelectedActivityItem[]>(() => {
    const selectedDate = this.selectedDate();
    const todayIso = this.toIsoDate(this.today);
    const day = this.calendarDays().find((item) => item.isoDate === selectedDate);

    return (day?.activities ?? [])
      .slice()
      .sort((left, right) => (left.time ?? '23:59').localeCompare(right.time ?? '23:59'))
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        typeLabel: activity.activityTypeName,
        colorHex: activity.backgroundColor,
        dateStr: activity.date,
        shortDate: this.formatShortDate(activity.date),
        status: this.resolveActivityStatus(activity, todayIso),
        activity
      }));
  });

  readonly upcomingItems = computed<SelectedActivityItem[]>(() => {
    const todayIso = this.toIsoDate(this.today);

    return (this.calendar()?.upcomingActivities ?? []).map((activity) => ({
      id: activity.id,
      title: activity.title,
      typeLabel: activity.activityTypeName,
      colorHex: activity.backgroundColor,
      dateStr: activity.date,
      shortDate: this.formatShortDate(activity.date),
      status: this.resolveActivityStatus(activity, todayIso),
      activity
    }));
  });

  readonly selectedDateLabel = computed(() =>
    new Intl.DateTimeFormat('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${this.selectedDate()}T00:00:00`))
  );

  constructor() {
    this.activatedRoute.data.subscribe((data) => {
      this.isReadOnly.set(Boolean(data['roles']?.includes?.('STUDENT')) || Boolean(data['readOnly']));
    });
    this.loadCourses();
    this.loadCalendar();
  }

  goToToday(): void {
    this.visibleYear.set(this.today.getFullYear());
    this.visibleMonth.set(this.today.getMonth() + 1);
    this.selectedDate.set(this.toIsoDate(this.today));
    this.loadCalendar();
  }

  changeCourseFilter(rawValue: string | number | null): void {
    const nextCourseId = rawValue === null || rawValue === '' ? null : Number(rawValue);
    this.selectedCourseId.set(Number.isFinite(nextCourseId as number) ? nextCourseId : null);
    this.loadCalendar();
  }

  goToPreviousMonth(): void {
    const current = new Date(this.visibleYear(), this.visibleMonth() - 1, 1);
    current.setMonth(current.getMonth() - 1);
    this.visibleYear.set(current.getFullYear());
    this.visibleMonth.set(current.getMonth() + 1);
    this.selectedDate.set(this.toIsoDate(new Date(current.getFullYear(), current.getMonth(), 1)));
    this.loadCalendar();
  }

  goToNextMonth(): void {
    const current = new Date(this.visibleYear(), this.visibleMonth() - 1, 1);
    current.setMonth(current.getMonth() + 1);
    this.visibleYear.set(current.getFullYear());
    this.visibleMonth.set(current.getMonth() + 1);
    this.selectedDate.set(this.toIsoDate(new Date(current.getFullYear(), current.getMonth(), 1)));
    this.loadCalendar();
  }

  selectDate(dateStr: string): void {
    this.selectedDate.set(dateStr);
  }

  handleDayDoubleClick(dateStr: string): void {
    this.selectedDate.set(dateStr);
    this.openNewActivityDialog(dateStr);
  }

  visibleDayActivities(day: ActivityCalendarDay, limit = 1): SchoolActivity[] {
    return day.activities.slice(0, limit);
  }

  hiddenActivityCount(day: ActivityCalendarDay, limit = 1): number {
    return Math.max(day.activities.length - limit, 0);
  }

  async downloadCurrentMonthPdf(): Promise<void> {
    const calendar = this.calendar();
    const exportTarget = this.pdfCalendarRef?.nativeElement;
    if (!calendar || !exportTarget || this.monthGrid().length === 0) {
      this.snackBar.open('El calendario todavía no está listo para exportar', 'Cerrar', { duration: 2600 });
      return;
    }

    try {
      this.isExportingPdf.set(true);

      const canvas = await html2canvas(exportTarget, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const scale = Math.min(printableWidth / canvas.width, printableHeight / canvas.height);
      const renderedWidth = canvas.width * scale;
      const renderedHeight = canvas.height * scale;
      const x = (pageWidth - renderedWidth) / 2;
      const y = (pageHeight - renderedHeight) / 2;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, renderedWidth, renderedHeight, undefined, 'FAST');
      pdf.save(this.buildPdfFileName(calendar.monthLabel));

      this.snackBar.open('Calendario descargado en PDF', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible generar el PDF del calendario', 'Cerrar', { duration: 3200 });
    } finally {
      this.isExportingPdf.set(false);
    }
  }

  exportJson(): void {
    if (this.isExportingJson()) {
      return;
    }

    const year = this.visibleYear();
    const selectedCourseId = this.selectedCourseId();
    const selectedCourseName = this.selectedCourseName();

    this.isExportingJson.set(true);
    forkJoin(
      Array.from({ length: 12 }, (_, index) =>
        this.activityCalendarApiService.getCalendar(year, index + 1, selectedCourseId).pipe(
          catchError(() => of(null))
        )
      )
    ).subscribe({
      next: (months) => {
        const payload = {
          generatedAt: new Date().toISOString(),
          generatedBy: this.user()?.nombre ?? 'Usuario',
          filters: {
            year,
            courseId: selectedCourseId,
            courseName: selectedCourseName
          },
          currentMonth: {
            year: this.visibleYear(),
            month: this.visibleMonth(),
            selectedDate: this.selectedDate()
          },
          yearHistory: {
            year,
            months: months.map((calendar, index) => ({
              month: index + 1,
              calendar
            })),
            monthsWithData: months.filter((calendar) => !!calendar).length
          }
        };

        this.downloadJsonFile(payload, year, selectedCourseName);
        this.isExportingJson.set(false);
        this.snackBar.open('JSON anual descargado correctamente', 'Cerrar', { duration: 2600 });
      },
      error: () => {
        this.isExportingJson.set(false);
        this.snackBar.open('No fue posible exportar el JSON anual de actividades', 'Cerrar', { duration: 3200 });
      }
    });
  }

  openNewActivityDialog(selectedDate?: string): void {
    if (this.isReadOnly()) {
      return;
    }

    const calendar = this.calendar();
    if (!calendar) {
      return;
    }

    const dialogRef = this.dialog.open(ActivityDialogComponent, {
      data: { activityTypes: calendar.activityTypes, selectedDate, courseId: this.selectedCourseId() },
      width: '860px',
      maxWidth: '84vw',
      maxHeight: '88vh',
      autoFocus: false,
      panelClass: 'activity-dialog-panel',
      backdropClass: 'activity-dialog-backdrop'
    });

    dialogRef.afterClosed().subscribe((result?: { action: 'save'; payload: CreateSchoolActivityRequest } | { action: 'delete' }) => {
      if (!result || result.action !== 'save') {
        return;
      }

      this.activityCalendarApiService.createActivity(result.payload).subscribe({
        next: () => {
          this.snackBar.open('Actividad creada correctamente', 'Cerrar', { duration: 2800 });
          this.loadCalendar();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible crear la actividad')
      });
    });
  }

  openEditActivityDialog(activity: SchoolActivity): void {
    if (this.isReadOnly()) {
      return;
    }

    const calendar = this.calendar();
    if (!calendar) {
      return;
    }

    const dialogRef = this.dialog.open(ActivityDialogComponent, {
      data: { activityTypes: calendar.activityTypes, activity, courseId: activity.courseId ?? this.selectedCourseId() },
      width: '860px',
      maxWidth: '84vw',
      maxHeight: '88vh',
      autoFocus: false,
      panelClass: 'activity-dialog-panel',
      backdropClass: 'activity-dialog-backdrop'
    });

    dialogRef.afterClosed().subscribe((result?: { action: 'save'; payload: CreateSchoolActivityRequest } | { action: 'delete' }) => {
      if (!result) {
        return;
      }

      if (result.action === 'delete') {
        this.deleteActivity(activity);
        return;
      }

      this.activityCalendarApiService.updateActivity(activity.id, result.payload).subscribe({
        next: () => {
          this.snackBar.open('Actividad actualizada correctamente', 'Cerrar', { duration: 2800 });
          this.loadCalendar();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible actualizar la actividad')
      });
    });
  }

  openActivityDetails(activity: SchoolActivity): void {
    this.openEditActivityDialog(activity);
  }

  openSelectedDayDetails(): void {
    if (!this.monthDetailDialogRef) {
      return;
    }

    this.dialog.open(this.monthDetailDialogRef, {
      width: '1180px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      panelClass: 'activities-month-dialog-panel'
    });
  }

  editFromDetail(activity: SchoolActivity): void {
    this.dialog.closeAll();
    this.openEditActivityDialog(activity);
  }

  deleteFromDetail(activity: SchoolActivity): void {
    this.dialog.closeAll();
    this.deleteActivity(activity);
  }

  deleteActivity(activity: SchoolActivity): void {
    if (this.isReadOnly()) {
      return;
    }

    const ref = this.snackBar.open(`Eliminar ${activity.title}?`, 'Confirmar', { duration: 5000 });
    ref.onAction().subscribe(() => {
      this.activityCalendarApiService.deleteActivity(activity.id).subscribe({
        next: () => {
          this.snackBar.open('Actividad eliminada correctamente', 'Cerrar', { duration: 2600 });
          this.loadCalendar();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar la actividad')
      });
    });
  }

  formatTime(time: string | null): string {
    if (!time) {
      return 'Todo el día';
    }
    return time.slice(0, 5);
  }

  formatShortDate(date: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short'
    })
      .format(new Date(`${date}T00:00:00`))
      .replace('.', '')
      .replace(/^0/, '')
      .toUpperCase();
  }

  formatCourseLabel(course: Course): string {
    const trimmedName = course.name.trim();
    const trimmedLetter = (course.letter ?? '').trim();
    if (!trimmedLetter) {
      return trimmedName;
    }
    return trimmedName.toUpperCase().endsWith(` ${trimmedLetter.toUpperCase()}`) ? trimmedName : `${trimmedName} ${trimmedLetter}`;
  }

  private loadCalendar(): void {
    this.isLoading.set(true);

    this.activityCalendarApiService.getCalendar(this.visibleYear(), this.visibleMonth(), this.selectedCourseId()).subscribe({
      next: (calendar) => {
        this.calendar.set(calendar);
        this.visibleYear.set(calendar.year);
        this.visibleMonth.set(calendar.month);

        const todayIso = this.toIsoDate(this.today);
        const monthPrefix = `${calendar.year}-${String(calendar.month).padStart(2, '0')}`;
        if (!this.selectedDate().startsWith(monthPrefix)) {
          this.selectedDate.set(
            todayIso.startsWith(monthPrefix)
              ? todayIso
              : this.toIsoDate(new Date(calendar.year, calendar.month - 1, 1))
          );
        }

        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el calendario de actividades');
      }
    });
  }

  private loadCourses(): void {
    this.courseApiService.findAll().subscribe({
      next: (courses) => {
        this.courses.set(courses.filter((course) => course.active));
      },
      error: () => {
        this.courses.set([]);
      }
    });
  }

  private toIsoDate(date: Date): string {
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private buildPdfFileName(monthLabel: string): string {
    return `calendario-${monthLabel.toLowerCase().replaceAll(' ', '-')}.pdf`;
  }

  private downloadJsonFile(payload: unknown, year: number, courseName: string): void {
    const slug = courseName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'todos-los-cursos';
    const fileName = `actividades-export-${year}-${slug}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private resolveActivityStatus(activity: SchoolActivity, todayIso: string): 'UPCOMING' | 'IN_PROGRESS' | 'DONE' {
    const endDate = activity.endDate ?? activity.date;
    if (activity.date > todayIso) {
      return 'UPCOMING';
    }

    if (endDate < todayIso) {
      return 'DONE';
    }

    return 'IN_PROGRESS';
  }
}
