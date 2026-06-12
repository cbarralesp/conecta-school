import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
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
import { StudentApiService } from '../../../core/services/student-api.service';
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

interface StudentLegendItem {
  key: 'exam' | 'hw' | 'event' | 'holiday' | 'meeting';
  label: string;
}

interface StudentMonthlyStatItem {
  key: 'exam' | 'hw' | 'event' | 'holiday' | 'meeting' | 'week';
  label: string;
  value: number;
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
  private readonly studentApiService = inject(StudentApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly today = new Date();

  readonly isLoading = signal(false);
  readonly isExportingPdf = signal(false);
  readonly isExportingJson = signal(false);
  readonly calendar = signal<ActivityCalendar | null>(null);
  readonly exportCalendar = signal<ActivityCalendar | null>(null);
  readonly exportCourseName = signal<string | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly selectedCourseId = signal<number | null>(null);
  readonly studentCourseName = signal<string>('');
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
  readonly exportCalendarView = computed(() => this.exportCalendar() ?? this.calendar());
  readonly exportMonthLabel = computed(() => this.exportCalendarView()?.monthLabel ?? this.monthLabel());
  readonly pdfTitle = computed(() => `Calendario ${this.exportMonthLabel()} - ${this.exportCourseName() ?? this.selectedCourseName()}`);
  readonly selectedCourseName = computed(() => {
    if (this.isReadOnly() && this.studentCourseName().trim()) {
      return this.studentCourseName().trim();
    }

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
  readonly exportCalendarDays = computed<ActivityCalendarDay[]>(() => this.exportCalendarView()?.days ?? []);

  readonly monthGrid = computed(() => {
    const days = this.calendarDays();
    return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
  });
  readonly exportMonthGrid = computed(() => {
    const days = this.exportCalendarDays();
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
  readonly studentLegendItems: StudentLegendItem[] = [
    { key: 'exam', label: 'Prueba' },
    { key: 'hw', label: 'Entrega' },
    { key: 'event', label: 'Evento' },
    { key: 'holiday', label: 'Feriado' },
    { key: 'meeting', label: 'Reunion' }
  ];
  readonly studentVisibleDayActivities = computed(() =>
    this.monthGrid().map((week) =>
      week.map((day) => ({
        ...day,
        visibleActivities: day.activities.slice(0, 3)
      }))
    )
  );
  readonly studentMonthlyStats = computed<StudentMonthlyStatItem[]>(() => {
    const monthlyActivities = this.calendar()?.monthlyActivities ?? [];
    const today = new Date();
    const weekStart = new Date(today);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(today.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const totals = {
      exam: 0,
      hw: 0,
      event: 0,
      holiday: 0,
      meeting: 0,
      week: 0
    };

    for (const activity of monthlyActivities) {
      const tone = this.studentActivityTone(activity);
      totals[tone] += 1;

      const activityDate = new Date(`${activity.date}T00:00:00`);
      if (activityDate >= weekStart && activityDate <= weekEnd) {
        totals.week += 1;
      }
    }

    return [
      { key: 'exam', label: 'Pruebas', value: totals.exam },
      { key: 'hw', label: 'Entregas', value: totals.hw },
      { key: 'event', label: 'Eventos', value: totals.event },
      { key: 'meeting', label: 'Reuniones', value: totals.meeting },
      { key: 'holiday', label: 'Feriados', value: totals.holiday },
      { key: 'week', label: 'Esta semana', value: totals.week }
    ];
  });

  constructor() {
    this.activatedRoute.data.subscribe((data) => {
      const readOnly = Boolean(data['roles']?.includes?.('STUDENT')) || Boolean(data['readOnly']);
      this.isReadOnly.set(readOnly);

      if (readOnly) {
        this.loadStudentCalendarContext();
        return;
      }

      this.loadCourses();
      this.loadCalendar();
    });
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

      if (!this.isReadOnly() && this.selectedCourseId() == null) {
        const activeCourses = this.courses();
        if (activeCourses.length === 0) {
          this.snackBar.open('No hay cursos disponibles para exportar', 'Cerrar', { duration: 2600 });
          return;
        }

        for (const course of activeCourses) {
          const courseCalendar = await firstValueFrom(
            this.activityCalendarApiService.getCalendar(this.visibleYear(), this.visibleMonth(), course.id)
          );
          await this.renderPdfFromCalendar(courseCalendar, this.formatCourseLabel(course));
        }

        this.snackBar.open('Se descargaron los calendarios PDF de todos los cursos', 'Cerrar', { duration: 3000 });
        return;
      }

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
      this.exportCalendar.set(null);
      this.exportCourseName.set(null);
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
      data: {
        activityTypes: calendar.activityTypes,
        selectedDate,
        courseId: this.selectedCourseId()
      },
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
      data: {
        activityTypes: calendar.activityTypes,
        activity,
        courseId: activity.courseId ?? this.selectedCourseId()
      },
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

  studentActivityTone(activity: SchoolActivity): 'exam' | 'hw' | 'event' | 'holiday' | 'meeting' {
    const code = this.normalizeText(activity.activityTypeCode);
    const name = this.normalizeText(activity.activityTypeName);
    const title = this.normalizeText(activity.title);

    if (
      code.includes('prueb') ||
      code.includes('eval') ||
      name.includes('prueb') ||
      name.includes('evalu') ||
      title.includes('prueb') ||
      title.includes('evalu')
    ) {
      return 'exam';
    }

    if (
      code.includes('tarea') ||
      code.includes('entrega') ||
      name.includes('tarea') ||
      name.includes('entrega') ||
      title.includes('entrega') ||
      title.includes('trabajo') ||
      title.includes('guia')
    ) {
      return 'hw';
    }

    if (
      code.includes('feriad') ||
      name.includes('feriad') ||
      title.includes('feriad') ||
      title.includes('vacacion') ||
      title.includes('suspension')
    ) {
      return 'holiday';
    }

    if (
      code.includes('reunion') ||
      name.includes('reunion') ||
      title.includes('reunion') ||
      title.includes('consejo') ||
      title.includes('apoderado')
    ) {
      return 'meeting';
    }

    return 'event';
  }

  studentActivityIcon(activity: SchoolActivity): string {
    switch (this.studentActivityTone(activity)) {
      case 'exam':
        return 'assignment';
      case 'hw':
        return 'upload_file';
      case 'holiday':
        return 'flag';
      case 'meeting':
        return 'groups';
      default:
        return 'star';
    }
  }

  studentActivityBadgeLabel(activity: SchoolActivity): string {
    switch (this.studentActivityTone(activity)) {
      case 'exam':
        return 'Prueba';
      case 'hw':
        return 'Entrega';
      case 'holiday':
        return 'Feriado';
      case 'meeting':
        return 'Reunion';
      default:
        return 'Evento';
    }
  }

  studentActivityChipClass(activity: SchoolActivity): string {
    return `student-chip--${this.studentActivityTone(activity)}`;
  }

  studentSummaryStatClass(key: StudentMonthlyStatItem['key']): string {
    return key === 'week' ? 'student-stat--week' : `student-stat--${key}`;
  }

  studentLegendDotClass(key: StudentLegendItem['key']): string {
    return `student-legend__dot--${key}`;
  }

  studentMonthAriaLabel(): string {
    const label = this.monthLabel();
    return `Modulo de actividades mensuales, calendario academico de ${label}.`;
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

  private loadStudentCalendarContext(): void {
    forkJoin({
      dashboard: this.studentApiService.getDashboard().pipe(catchError(() => of(null))),
      courses: this.courseApiService.findAll().pipe(catchError(() => of([] as Course[])))
    }).subscribe(({ dashboard, courses }) => {
      const activeCourses = courses.filter((course) => course.active);
      this.courses.set(activeCourses);

      const currentCourse = dashboard?.enrolledCourses[0] ?? null;
      const currentCourseName = currentCourse?.courseName ?? '';
      const resolvedCourseId =
        this.resolveStudentCourseId(currentCourseName, activeCourses) ?? currentCourse?.id ?? null;

      this.selectedCourseId.set(resolvedCourseId);
      this.studentCourseName.set(currentCourseName);
      this.loadCalendar();
    });
  }

  private resolveStudentCourseId(courseName: string, courses: Course[]): number | null {
    const normalizedStudentCourse = this.normalizeCourseLabel(courseName);
    if (!normalizedStudentCourse) {
      return null;
    }

    const directMatch = courses.find((course) => this.normalizeCourseLabel(this.formatCourseLabel(course)) === normalizedStudentCourse);
    if (directMatch) {
      return directMatch.id;
    }

    const nameMatch = courses.find((course) => this.normalizeCourseLabel(course.name) === normalizedStudentCourse);
    return nameMatch?.id ?? null;
  }

  private normalizeCourseLabel(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
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

  private async renderPdfFromCalendar(calendar: ActivityCalendar, courseName: string): Promise<void> {
    const exportTarget = this.pdfCalendarRef?.nativeElement;
    if (!exportTarget) {
      throw new Error('No fue posible preparar el PDF');
    }

    this.exportCalendar.set(calendar);
    this.exportCourseName.set(courseName);
    await this.waitForRender();

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
    pdf.save(this.buildPdfFileName(calendar.monthLabel, courseName));
  }

  private buildPdfFileName(monthLabel: string, courseName?: string): string {
    const safeMonth = monthLabel.toLowerCase().replaceAll(' ', '-');
    if (!courseName) {
      return `calendario-${safeMonth}.pdf`;
    }

    const safeCourse = courseName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'curso';
    return `calendario-${safeMonth}-${safeCourse}.pdf`;
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
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

  private waitForRender(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }
}
