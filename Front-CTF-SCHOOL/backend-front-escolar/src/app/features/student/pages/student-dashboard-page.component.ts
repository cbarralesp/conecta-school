import { HttpErrorResponse } from '@angular/common/http';
import { NgClass, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StudentAttendanceDetail, StudentDashboard, StudentPortalSubject } from '../../../core/models/student.models';
import { AuthService } from '../../../core/services/auth.service';
import { StudentApiService } from '../../../core/services/student-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type StudentSection =
  | 'overview'
  | 'courses'
  | 'subjects'
  | 'schedule'
  | 'grades'
  | 'attendance'
  | 'activities';

@Component({
  selector: 'app-student-dashboard-page',
  imports: [
    NgStyle,
    NgClass,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './student-dashboard-page.component.html',
  styleUrl: './student-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDashboardPageComponent {
  @ViewChild('studentSchedulePdf') private studentSchedulePdfRef?: ElementRef<HTMLElement>;

  private readonly authService = inject(AuthService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(true);
  readonly dashboard = signal<StudentDashboard | null>(null);
  readonly attendance = signal<StudentAttendanceDetail | null>(null);
  readonly studentSubjects = signal<StudentPortalSubject[]>([]);
  readonly activeSection = signal<StudentSection>('overview');
  readonly studentSearch = signal('');
  readonly isExportingSchedulePdf = signal(false);
  readonly sidebarActiveItem = computed(() => {
    const section = this.activeSection();
    return section === 'overview' ? 'dashboard' : section === 'courses' ? 'subjects' : section;
  });

  readonly welcomeName = computed(() => this.dashboard()?.studentName.split(' ')[0] ?? 'estudiante');
  readonly fullStudentName = computed(() => this.dashboard()?.studentName ?? 'Estudiante');
  readonly currentCourseLabel = computed(
    () => this.dashboard()?.enrolledCourses[0]?.courseName ?? 'Sin curso asignado'
  );
  readonly currentYearLabel = computed(() => {
    const courseCode = this.dashboard()?.enrolledCourses[0]?.courseCode ?? '';
    const yearMatch = courseCode.match(/(20\d{2})/);
    return yearMatch?.[1] ?? new Date().getFullYear().toString();
  });
  readonly todayLabel = computed(() =>
    new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date())
  );
  readonly averageValue = computed(() => {
    const averages = (this.dashboard()?.gradeSummary ?? [])
      .map((subject) => subject.average)
      .filter((value): value is number => value !== null);

    if (averages.length === 0) {
      return null;
    }

    return Number((averages.reduce((sum, value) => sum + value, 0) / averages.length).toFixed(1));
  });
  readonly heroHighlights = computed(() => {
    const nextBlock = this.todaySchedule().find((item) => !item.isPast) ?? this.todaySchedule()[0] ?? null;
    return [
      {
        icon: 'calendar_month',
        label: this.currentCourseLabel()
      },
      {
        icon: 'check_circle',
        label: `Asistencia ${this.dashboard()?.attendancePercentage ?? 0}%`
      },
      {
        icon: 'local_fire_department',
        label: nextBlock ? `Siguiente bloque ${nextBlock.startTime}` : 'Sin bloques pendientes hoy'
      }
    ];
  });
  readonly dashboardStats = computed(() => [
    {
      label: 'Promedio general',
      value: this.averageValue() !== null ? this.averageValue()!.toFixed(1) : '-',
      helper: 'Resumen academico',
      tone: this.scoreTone(this.averageValue()),
      icon: 'trending_up'
    },
    {
      label: 'Asistencia',
      value: `${this.dashboard()?.attendancePercentage ?? 0}%`,
      helper: `${this.attendance()?.summary.presentCount ?? 0} presentes`,
      tone: this.attendanceTone(this.dashboard()?.attendancePercentage ?? 0),
      icon: 'verified'
    },
    {
      label: 'Asignaturas',
      value: this.studentSubjects().length || this.dashboard()?.subjects.length || 0,
      helper: 'Activas',
      tone: 'brand',
      icon: 'emoji_events'
    },
    {
      label: 'Ultima nota',
      value: this.dashboard()?.latestGrades[0]?.score?.toFixed(1) ?? '-',
      helper: this.dashboard()?.latestGrades[0]?.subjectName ?? 'Sin registros',
      tone: this.scoreTone(this.dashboard()?.latestGrades[0]?.score ?? null),
      icon: 'star'
    }
  ]);

  readonly cards = computed(() => [
    {
      title: 'Mis asignaturas',
      value: this.studentSubjects().length || this.dashboard()?.subjects.length || 0,
      caption: 'Asignaturas activas',
      tone: 'brand',
      icon: 'menu_book'
    },
    {
      title: 'Asistencia',
      value: `${this.dashboard()?.attendancePercentage ?? 0}%`,
      caption: 'Promedio general',
      tone: 'success',
      icon: 'fact_check'
    },
    {
      title: 'Evaluaciones',
      value: this.gradesOverallAverage(),
      caption: 'Promedio general',
      tone: 'violet',
      icon: 'grading'
    },
    {
      title: 'Actividades',
      value: this.dashboard()?.upcomingActivitiesCount ?? 0,
      caption: 'Proximas esta semana',
      tone: 'warning',
      icon: 'event'
    }
  ]);

  readonly subjectCards = computed(() => {
    const palette = [
      { icon: 'close', tone: 'brand' },
      { icon: 'library_add', tone: 'success' },
      { icon: 'task_alt', tone: 'sky' },
      { icon: 'science', tone: 'success' },
      { icon: 'translate', tone: 'violet' },
      { icon: 'public', tone: 'warning' }
    ] as const;

    return this.studentSubjects().map((subject, index) => {
      const relatedGrades = (this.dashboard()?.latestGrades ?? []).filter(
        (grade) => grade.subjectName === subject.subjectName && grade.score !== null
      );
      const average = relatedGrades.length
        ? (relatedGrades.reduce((sum, grade) => sum + (grade.score ?? 0), 0) / relatedGrades.length).toFixed(1)
        : null;
      const style = palette[index % palette.length];

      return {
        ...subject,
        average,
        icon: style.icon,
        tone: style.tone
      };
    });
  });

  readonly overviewSubjects = computed(() => this.subjectCards().slice(0, 5));
  readonly subjectBrowserCards = computed(() => {
    const query = this.studentSearch().trim().toLowerCase();
    const uniqueSubjects = new Map<number | string, StudentPortalSubject>();

    for (const subject of this.studentSubjects()) {
      const key = subject.subjectId || subject.subjectName.trim().toLowerCase();
      if (!uniqueSubjects.has(key)) {
        uniqueSubjects.set(key, subject);
      }
    }

    return Array.from(uniqueSubjects.values())
      .map((subject) => ({
        ...subject,
        icon: this.subjectBrowserIcon(subject.subjectName),
        tone: this.subjectBrowserTone(subject.subjectName)
      }))
      .filter((subject) => {
        if (!query) {
          return true;
        }

        const searchable = `${subject.subjectName} ${subject.teacherName} ${subject.courseName}`.toLowerCase();
        return searchable.includes(query);
      });
  });
  readonly overviewActivities = computed(() => (this.dashboard()?.upcomingActivities ?? []).slice(0, 3));
  readonly performanceSubjects = computed(() => this.gradeSubjects().slice(0, 5));
  readonly todaySchedule = computed(() => {
    const dayKey = this.normalizeDayKey(
      new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(new Date())
    );
    const currentMinutes = this.nowMinutes();

    return (this.dashboard()?.weeklySchedule ?? [])
      .filter((item) => this.normalizeDayKey(item.dayOfWeek) === dayKey)
      .sort((left, right) => this.toMinutes(left.startTime) - this.toMinutes(right.startTime))
      .map((item) => ({
        ...item,
        isCurrent: this.toMinutes(item.startTime) <= currentMinutes && currentMinutes < this.toMinutes(item.endTime),
        isPast: this.toMinutes(item.endTime) < currentMinutes
      }));
  });
  readonly attendanceWeek = computed(() => this.attendance()?.currentWeek ?? []);
  readonly recentAttendance = computed(() => this.attendance()?.recentRecords.slice(0, 3) ?? []);
  readonly quickLinks = computed(() => [
    {
      title: 'Mis notas',
      description: `${this.totalEvaluationsCount()} evaluacion(es) registradas`,
      route: '/alumno/calificaciones',
      icon: 'grading',
      tone: 'tone-brand'
    },
    {
      title: 'Mi asistencia',
      description: `${this.attendance()?.summary.percentage ?? this.dashboard()?.attendancePercentage ?? 0}% de asistencia`,
      route: '/alumno/asistencia',
      icon: 'calendar_month',
      tone: 'tone-success'
    },
    {
      title: 'Mis asignaturas',
      description: `${this.studentSubjects().length || this.dashboard()?.subjects.length || 0} asignaturas activas`,
      route: '/alumno/asignaturas',
      icon: 'library_books',
      tone: 'tone-violet'
    }
  ]);
  readonly heroFullName = computed(() => this.dashboard()?.studentName ?? 'Estudiante');
  readonly heroMeta = computed(() => `${this.currentCourseLabel()} · ${this.dashboard()?.studentRun ?? 'Sin RUN'} · Torre Fuerte School`);
  readonly topGradeSubjects = computed(() => this.gradeSubjects().slice(0, 6));
  readonly recentObservations = computed(() =>
    (this.attendance()?.recentRecords ?? [])
      .filter((record) => record.note?.trim())
      .slice(0, 2)
  );
  readonly gradeColumns = computed(() => {
    const maxEvaluations = Math.max(
      3,
      ...(this.dashboard()?.gradeSummary ?? []).map((subject) => subject.evaluations.length)
    );
    return Array.from({ length: Math.min(maxEvaluations, 4) }, (_, index) => index);
  });
  readonly gradeSubjects = computed(() => {
    const palette = ['tone-brand', 'tone-success', 'tone-warning', 'tone-violet', 'tone-sky'];
    const icons = ['calculate', 'menu_book', 'public', 'science', 'translate'];
    const summaries = this.dashboard()?.gradeSummary ?? [];

    if (summaries.length > 0) {
      return summaries.map((subject, index) => ({
        ...subject,
        tone: palette[index % palette.length],
        icon: icons[index % icons.length],
        visibleEvaluations: this.gradeColumns().map((columnIndex) => subject.evaluations[columnIndex] ?? null)
      }));
    }

    const grouped = new Map<
      string,
      {
        subjectName: string;
        average: number | null;
        latestScore: number | null;
        evaluations: {
          evaluationName: string;
          score: number | null;
          periodName: string;
          recordedAt: string;
        }[];
      }
    >();

    for (const grade of this.dashboard()?.latestGrades ?? []) {
      const current = grouped.get(grade.subjectName) ?? {
        subjectName: grade.subjectName,
        average: null,
        latestScore: null,
        evaluations: []
      };

      current.evaluations.push({
        evaluationName: grade.evaluationName,
        score: grade.score,
        periodName: grade.periodName,
        recordedAt: grade.recordedAt
      });

      const validScores = current.evaluations
        .map((evaluation) => evaluation.score)
        .filter((value): value is number => value !== null);

      current.average =
        validScores.length > 0 ? validScores.reduce((sum, value) => sum + value, 0) / validScores.length : null;
      current.latestScore = current.evaluations.at(-1)?.score ?? null;

      grouped.set(grade.subjectName, current);
    }

    return Array.from(grouped.values()).map((subject, index) => ({
      ...subject,
      tone: palette[index % palette.length],
      icon: icons[index % icons.length],
      visibleEvaluations: this.gradeColumns().map((columnIndex) => subject.evaluations[columnIndex] ?? null)
    }));
  });
  readonly gradesOverallAverage = computed(() => {
    const averages = (this.dashboard()?.gradeSummary ?? [])
      .map((subject) => subject.average)
      .filter((value): value is number => value !== null);
    if (averages.length === 0) {
      return '-';
    }
    return (averages.reduce((sum, value) => sum + value, 0) / averages.length).toFixed(1);
  });
  readonly totalEvaluationsCount = computed(() =>
    (this.dashboard()?.gradeSummary ?? []).reduce((sum, subject) => sum + subject.evaluations.length, 0)
  );
  readonly recentGradeHistory = computed(() => (this.dashboard()?.latestGrades ?? []).slice(0, 5));
  readonly scheduleLegend = computed(() => [
    { label: 'Troncal', tone: 'tone-brand' },
    { label: 'Ciencias', tone: 'tone-success' },
    { label: 'Lenguaje', tone: 'tone-violet' },
    { label: 'Deporte', tone: 'tone-warning' }
  ]);
  readonly scheduleBlocksCount = computed(() => this.dashboard()?.weeklySchedule.length ?? 0);
  readonly scheduleWeekLabel = computed(() => {
    const weekDays = this.scheduleWeekDays();

    if (weekDays.length === 0) {
      return 'Sin semana disponible';
    }

    const firstDay = weekDays[0];
    const lastDay = weekDays[weekDays.length - 1];
    return `Semana del ${firstDay.dayNumber} al ${lastDay.dayNumber} de ${lastDay.monthLabel}`;
  });
  readonly scheduleWeekDays = computed(() => {
    const dayOrder = ['LUNES', 'MARTES', 'MIERCOLES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'SÁBADO'];
    const labels = new Map([
      ['LUNES', 'LUN'],
      ['MARTES', 'MAR'],
      ['MIERCOLES', 'MIE'],
      ['MIÉRCOLES', 'MIE'],
      ['JUEVES', 'JUE'],
      ['VIERNES', 'VIE'],
      ['SABADO', 'SAB'],
      ['SÁBADO', 'SAB']
    ]);
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const monthFormatter = new Intl.DateTimeFormat('es-CL', { month: 'short' });
    const todayKey = this.normalizeDayKey(new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(now));

    const days = [...new Set((this.dashboard()?.weeklySchedule ?? []).map((item) => item.dayOfWeek.toUpperCase()))];

    return days
      .sort((left, right) => dayOrder.indexOf(left) - dayOrder.indexOf(right))
      .map((dayKey, index) => {
        const currentDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);

        return {
          key: dayKey,
          shortLabel: labels.get(dayKey) ?? dayKey.slice(0, 3),
          fullLabel: this.dayLabel(dayKey),
          dayNumber: currentDate.getDate(),
          monthLabel: monthFormatter.format(currentDate).replace('.', ''),
          isToday: this.normalizeDayKey(dayKey) === todayKey
        };
      });
  });
  readonly scheduleRows = computed(() => {
    const palette = ['tone-brand', 'tone-success', 'tone-violet', 'tone-warning', 'tone-sky'];
    const blocks = this.dashboard()?.weeklySchedule ?? [];
    const startTimes = [...new Set(blocks.map((item) => item.startTime))].sort(
      (left, right) => this.toMinutes(left) - this.toMinutes(right)
    );
    const fallbackStarts = ['08:00', '08:45', '09:30', '10:15', '10:35', '11:20', '12:05', '12:50'];
    const visibleStarts = startTimes.length > 0 ? startTimes : fallbackStarts;

    return visibleStarts.map((startTime, rowIndex) => {
      const rowBlocks = this.scheduleWeekDays().map((day, index) => {
        const item =
          blocks.find((block) => block.dayOfWeek.toUpperCase() === day.key && block.startTime === startTime) ?? null;

        return {
          dayKey: day.key,
          item: item
            ? {
                ...item,
                isCurrent:
                  this.toMinutes(item.startTime) <= this.nowMinutes() && this.nowMinutes() < this.toMinutes(item.endTime),
                isPast: this.toMinutes(item.endTime) < this.nowMinutes()
              }
            : null,
          tone: palette[index % palette.length]
        };
      });

      const rowItem = rowBlocks.find((block) => block.item)?.item ?? null;

      return {
        startTime,
        endTime: rowItem?.endTime ?? visibleStarts[rowIndex + 1] ?? startTime,
        blocks: rowBlocks
      };
    });
  });
  readonly attendanceOverview = computed(() => {
    const detail = this.attendance();
    if (!detail) {
      return {
        percentage: this.dashboard()?.attendancePercentage ?? 0,
        label: 'Sin detalle de asistencia'
      };
    }

    return {
      percentage: detail.summary.percentage,
      label: `${detail.currentMonth.presentCount} presentes, ${detail.currentMonth.absentCount} ausencias`
    };
  });
  readonly attendanceRingOffset = computed(() => {
    const percentage = this.attendanceOverview().percentage;
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    return circumference - (Math.max(0, Math.min(100, percentage)) / 100) * circumference;
  });

  constructor() {
    this.activatedRoute.data.subscribe((data) => {
      this.activeSection.set((data['section'] as StudentSection | undefined) ?? 'overview');
    });
    this.loadDashboard();
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  isSectionActive(section: StudentSection): boolean {
    return this.activeSection() === section;
  }

  openSubjectDocuments(subjectId: number): void {
    void this.router.navigate(['/alumno/asignaturas', subjectId, 'documentos']);
  }

  openStudentRoute(route: string): void {
    void this.router.navigate([route]);
  }

  updateStudentSearch(value: string): void {
    this.studentSearch.set(value);
  }

  async downloadStudentSchedulePdf(): Promise<void> {
    const exportTarget = this.studentSchedulePdfRef?.nativeElement;
    if (!exportTarget || this.scheduleWeekDays().length === 0 || this.isExportingSchedulePdf()) {
      this.snackBar.open('El horario todavia no esta listo para exportar', 'Cerrar', { duration: 2600 });
      return;
    }

    try {
      this.isExportingSchedulePdf.set(true);

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
      pdf.save(this.buildStudentSchedulePdfName());
      this.snackBar.open('Horario semanal exportado en PDF', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible exportar el horario en PDF', 'Cerrar', { duration: 3200 });
    } finally {
      this.isExportingSchedulePdf.set(false);
    }
  }

  scoreTrackWidth(score: number | null): string {
    if (score === null) {
      return '8%';
    }

    return `${Math.max(8, Math.min(100, (score / 7) * 100))}%`;
  }

  scoreBadgeClass(score: number | null): string {
    const tone = this.scoreTone(score);
    return tone === 'success' ? 'is-high' : tone === 'warning' ? 'is-mid' : tone === 'danger' ? 'is-low' : '';
  }

  gradeCellClass(score: number | null | undefined): string {
    const tone = this.scoreTone(score ?? null);
    return tone === 'success' ? 'hi' : tone === 'warning' ? 'mid' : tone === 'danger' ? 'lo' : 'em';
  }

  scheduleState(item: { isCurrent: boolean; isPast: boolean }): string {
    if (item.isCurrent) {
      return 'En curso';
    }
    if (item.isPast) {
      return 'Realizada';
    }
    return 'Pendiente';
  }

  scheduleStateClass(item: { isCurrent: boolean; isPast: boolean }): string {
    if (item.isCurrent) {
      return 'is-current';
    }
    if (item.isPast) {
      return 'is-past';
    }
    return 'is-upcoming';
  }

  scheduleSubjectClass(subjectName: string): string {
    const normalized = this.normalizeDayKey(subjectName);

    if (normalized.includes('MAT')) {
      return 'sc-mat';
    }
    if (normalized.includes('LENG') || normalized.includes('COMUN') || normalized.includes('LECT')) {
      return 'sc-len';
    }
    if (normalized.includes('CIEN') && normalized.includes('NAT')) {
      return 'sc-cnat';
    }
    if (normalized.includes('ART')) {
      return 'sc-art';
    }
    if (normalized.includes('ING')) {
      return 'sc-ing';
    }
    if (normalized.includes('HIST')) {
      return 'sc-hist';
    }
    if (normalized.includes('MUS')) {
      return 'sc-mus';
    }
    if (normalized.includes('EDU') || normalized.includes('FIS')) {
      return 'sc-ef';
    }
    if (normalized.includes('TEC') || normalized.includes('COMPUT')) {
      return 'sc-tec';
    }
    if (normalized.includes('ORIENT')) {
      return 'sc-orient';
    }
    if (normalized.includes('SOC')) {
      return 'sc-csoc';
    }
    if (normalized.includes('RECRE')) {
      return 'sc-rec';
    }
    if (normalized.includes('ALMUER') || normalized.includes('COLAC')) {
      return 'sc-alm';
    }

    return 'sc-mat';
  }

  scheduleSubjectIcon(subjectName: string): string {
    switch (this.scheduleSubjectClass(subjectName)) {
      case 'sc-mat':
        return 'calculate';
      case 'sc-len':
        return 'menu_book';
      case 'sc-cnat':
        return 'science';
      case 'sc-art':
        return 'palette';
      case 'sc-ing':
        return 'translate';
      case 'sc-hist':
        return 'account_balance';
      case 'sc-mus':
        return 'music_note';
      case 'sc-ef':
        return 'sports';
      case 'sc-tec':
        return 'computer';
      case 'sc-orient':
        return 'psychology';
      case 'sc-csoc':
        return 'groups';
      case 'sc-rec':
        return 'coffee';
      case 'sc-alm':
        return 'restaurant';
      default:
        return 'menu_book';
    }
  }

  scheduleSubjectStyles(item: { subjectColorHex?: string | null }): Record<string, string> | null {
    const color = this.normalizeScheduleHex(item.subjectColorHex);
    if (!color) {
      return null;
    }

    return {
      '--schedule-subject-accent': color,
      '--schedule-subject-bg': this.toRgba(color, 0.14),
      '--schedule-subject-border': this.toRgba(color, 0.3),
      '--schedule-subject-icon-bg': this.toRgba(color, 0.18)
    };
  }

  hasScheduleColor(item: { subjectColorHex?: string | null }): boolean {
    return !!this.normalizeScheduleHex(item.subjectColorHex);
  }

  scheduleSubjectCardClasses(item: { subjectName: string; subjectColorHex?: string | null }): string[] {
    return this.hasScheduleColor(item) ? ['subj-card--dynamic'] : [this.scheduleSubjectClass(item.subjectName)];
  }

  todayScheduleStyles(item: { subjectColorHex?: string | null }): Record<string, string> | null {
    const color = this.normalizeScheduleHex(item.subjectColorHex);
    if (!color) {
      return null;
    }

    return {
      '--today-schedule-accent': color,
      '--today-schedule-bg': this.toRgba(color, 0.12),
      '--today-schedule-border': this.toRgba(color, 0.24),
      '--today-schedule-icon-bg': this.toRgba(color, 0.18)
    };
  }

  attendanceDayClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'PRESENTE':
      case 'PRESENT':
        return 'is-present';
      case 'ATRASO':
      case 'ATRASADO':
        return 'is-late';
      case 'AUSENTE':
        return 'is-absent';
      default:
        return 'is-empty';
    }
  }

  private subjectBrowserIcon(subjectName: string): string {
    const normalized = this.normalizeText(subjectName);

    if (normalized.includes('mat')) {
      return 'calculate';
    }
    if (normalized.includes('leng') || normalized.includes('lecto') || normalized.includes('lectura')) {
      return 'menu_book';
    }
    if (normalized.includes('ciencia') || normalized.includes('biolog') || normalized.includes('quim')) {
      return 'science';
    }
    if (normalized.includes('hist') || normalized.includes('social') || normalized.includes('geogra')) {
      return 'public';
    }
    if (normalized.includes('ingles') || normalized.includes('english')) {
      return 'translate';
    }
    if (normalized.includes('arte') || normalized.includes('musica')) {
      return 'palette';
    }
    if (normalized.includes('fisica') || normalized.includes('deporte')) {
      return 'sports';
    }
    if (normalized.includes('tecno') || normalized.includes('comput')) {
      return 'computer';
    }

    return 'auto_stories';
  }

  private subjectBrowserTone(subjectName: string): string {
    const normalized = this.normalizeText(subjectName);

    if (normalized.includes('mat')) {
      return 'violet';
    }
    if (normalized.includes('leng') || normalized.includes('lecto') || normalized.includes('lectura')) {
      return 'sky';
    }
    if (normalized.includes('ciencia') || normalized.includes('biolog') || normalized.includes('quim')) {
      return 'success';
    }
    if (normalized.includes('hist') || normalized.includes('social') || normalized.includes('geogra')) {
      return 'rose';
    }
    if (normalized.includes('ingles') || normalized.includes('english')) {
      return 'warning';
    }
    if (normalized.includes('arte') || normalized.includes('musica')) {
      return 'brand';
    }
    if (normalized.includes('fisica') || normalized.includes('deporte')) {
      return 'amber';
    }
    if (normalized.includes('tecno') || normalized.includes('comput')) {
      return 'blue';
    }

    return 'violet';
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
    return (hours || 0) * 60 + (minutes || 0);
  }

  private loadDashboard(): void {
    this.isLoading.set(true);

    this.studentApiService.getDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
      : 'No fue posible cargar el resumen del estudiante',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });

    this.studentApiService.getStudentSubjects().subscribe({
      next: (subjects) => this.studentSubjects.set(subjects),
      error: () => this.studentSubjects.set([])
    });

    this.studentApiService.getStudentAttendance().subscribe({
      next: (attendance) => this.attendance.set(attendance),
      error: () => this.attendance.set(null)
    });
  }

  private scoreTone(score: number | null | undefined): 'success' | 'warning' | 'danger' | 'brand' {
    if (score === null || score === undefined) {
      return 'brand';
    }
    if (score >= 6) {
      return 'success';
    }
    if (score >= 5) {
      return 'warning';
    }
    return 'danger';
  }

  private attendanceTone(percentage: number): 'success' | 'warning' | 'danger' | 'brand' {
    if (percentage >= 90) {
      return 'success';
    }
    if (percentage >= 75) {
      return 'warning';
    }
    return 'danger';
  }

  private nowMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  private normalizeDayKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private toRgba(hexColor: string, alpha: number): string {
    const hex = hexColor.replace('#', '').trim();
    const normalized = hex.length === 3
      ? hex.split('').map((char) => char + char).join('')
      : hex;

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return `rgba(79, 70, 229, ${alpha})`;
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private normalizeScheduleHex(color: string | null | undefined): string | null {
    if (!color) {
      return null;
    }

    const trimmed = color.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(normalized) ? normalized : null;
  }

  private buildStudentSchedulePdfName(): string {
    const nameToken = this.fullStudentName()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return `horario-semanal-${nameToken || 'estudiante'}.pdf`;
  }

  private dayLabel(dayKey: string): string {
    switch (this.normalizeDayKey(dayKey)) {
      case 'LUNES':
        return 'Lunes';
      case 'MARTES':
        return 'Martes';
      case 'MIERCOLES':
        return 'Miercoles';
      case 'JUEVES':
        return 'Jueves';
      case 'VIERNES':
        return 'Viernes';
      case 'SABADO':
        return 'Sabado';
      default:
        return dayKey;
    }
  }
}
