import { HttpErrorResponse } from '@angular/common/http';
import { NgClass, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
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
import { ScheduleCatalog, ScheduleEntry } from '../../../core/models/schedule.models';
import { StudentAttendanceDetail, StudentDashboard, StudentGradeEvaluation, StudentPortalSubject } from '../../../core/models/student.models';
import { AuthService } from '../../../core/services/auth.service';
import { ScheduleApiService } from '../../../core/services/schedule-api.service';
import { StudentApiService } from '../../../core/services/student-api.service';
import { resolveCurrentAcademicSemester } from '../../../core/utils/academic-semester';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type StudentSection =
  | 'overview'
  | 'courses'
  | 'subjects'
  | 'schedule'
  | 'grades'
  | 'attendance'
  | 'activities';

type StudentScheduleViewItem = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseName: string;
  subjectName: string;
  room: string;
  subjectColorHex?: string | null;
  teacherName?: string | null;
  blockType?: 'CLASE' | 'RECREO';
  order?: number | null;
};

type DashboardOverviewTab = 'grades' | 'performance' | 'attendance';
type GradeSemesterFilter = '1' | '2';

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
export class StudentDashboardPageComponent implements OnDestroy {
  @ViewChild('studentSchedulePdf') private studentSchedulePdfRef?: ElementRef<HTMLElement>;
  @ViewChild('studentReportPdf') private studentReportPdfRef?: ElementRef<HTMLElement>;

  private readonly authService = inject(AuthService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly scheduleApiService = inject(ScheduleApiService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private overviewTabRotationId: number | null = null;
  private overviewTabAutoEnabled = true;

  readonly isLoading = signal(true);
  readonly dashboard = signal<StudentDashboard | null>(null);
  readonly attendance = signal<StudentAttendanceDetail | null>(null);
  readonly studentSubjects = signal<StudentPortalSubject[]>([]);
  readonly activeSection = signal<StudentSection>('overview');
  readonly studentSearch = signal('');
  readonly gradesSearch = signal('');
  readonly gradesSemesterFilter = signal<GradeSemesterFilter>(resolveCurrentAcademicSemester() === 2 ? '2' : '1');
  readonly gradesSubjectFilter = signal('all');
  readonly selectedGradeSubjectName = signal<string | null>(null);
  readonly selectedOverviewTab = signal<DashboardOverviewTab>('grades');
  readonly selectedScheduleMobileDay = signal('');
  readonly overviewSchedulePage = signal(0);
  readonly isExportingSchedulePdf = signal(false);
  readonly isExportingReportPdf = signal(false);
  readonly isReportPreviewOpen = signal(false);
  readonly studentScheduleCatalog = signal<ScheduleCatalog | null>(null);
  readonly studentScheduleEntries = signal<ScheduleEntry[]>([]);
  readonly studentSchedulePeriodId = signal<number | null>(null);
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
      helper: 'Resumen académico',
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
      icon: 'menu_book'
    },
    {
      label: 'Última nota',
      value: this.dashboard()?.latestGrades[0]?.score?.toFixed(1) ?? '-',
      helper: this.dashboard()?.latestGrades[0]?.subjectName ?? 'Sin registros',
      tone: this.scoreTone(this.dashboard()?.latestGrades[0]?.score ?? null),
      icon: 'star'
    }
  ]);

  dashboardStatValueColor(tone: string): string {
    switch (tone) {
      case 'success':
        return '#0f9d6b';
      case 'warning':
      case 'amber':
        return '#d97706';
      case 'danger':
        return '#e3342f';
      case 'violet':
        return '#5f35f2';
      case 'rose':
        return '#e11d48';
      case 'brand':
      case 'blue':
      default:
        return '#2f65e1';
    }
  }

  dashboardStatIconBackground(tone: string): string {
    switch (tone) {
      case 'success':
        return '#ecfdf5';
      case 'warning':
        return '#fffbeb';
      case 'danger':
        return '#fef2f2';
      case 'violet':
        return '#ede9fe';
      case 'rose':
        return '#ffe4eb';
      case 'amber':
        return '#fff3d6';
      case 'blue':
        return '#e0ecff';
      case 'brand':
      default:
        return '#eff6ff';
    }
  }

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
  readonly scheduleSourceItems = computed<StudentScheduleViewItem[]>(() => {
    const scheduleEntries = this.studentScheduleEntries();

    if (scheduleEntries.length > 0) {
      return scheduleEntries.map((item) => ({
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        courseName: item.courseName,
        subjectName: item.subjectName,
        room: item.room ?? '',
        subjectColorHex: item.subjectColorHex ?? null,
        teacherName: item.teacherFullName,
        blockType: item.blockType as 'CLASE' | 'RECREO',
        order: item.order
      }));
    }

    return (this.dashboard()?.weeklySchedule ?? []).map((item) => ({
      ...item,
      teacherName: this.scheduleTeacherName(item.subjectName),
      blockType: 'CLASE' as const,
      order: null
    }));
  });
  readonly scheduleCourseBlocks = computed(() =>
    (this.studentScheduleCatalog()?.blocks ?? [])
      .filter((block) => ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'].includes(this.normalizeDayKey(block.dayOfWeek)))
      .sort((left, right) => {
        const startDiff = this.toMinutes(left.startTime) - this.toMinutes(right.startTime);
        if (startDiff !== 0) {
          return startDiff;
        }

        return left.order - right.order;
      })
  );
  readonly todaySchedule = computed(() => {
    const dayKey = this.normalizeDayKey(
      new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(new Date())
    );
    const currentMinutes = this.nowMinutes();

    return this.scheduleSourceItems()
      .filter((item) => this.normalizeDayKey(item.dayOfWeek) === dayKey)
      .sort((left, right) => this.toMinutes(left.startTime) - this.toMinutes(right.startTime))
      .map((item) => ({
        ...item,
        isCurrent: this.toMinutes(item.startTime) <= currentMinutes && currentMinutes < this.toMinutes(item.endTime),
        isPast: this.toMinutes(item.endTime) < currentMinutes
      }));
  });
  readonly overviewSchedulePageCount = computed(() => Math.max(1, Math.ceil(this.todaySchedule().length / 4)));
  readonly overviewScheduleItems = computed(() => {
    const items = this.todaySchedule();
    const pageCount = this.overviewSchedulePageCount();
    const page = Math.max(0, Math.min(this.overviewSchedulePage(), pageCount - 1));
    const start = page * 4;
    return items.slice(start, start + 4);
  });
  readonly attendanceWeek = computed(() => this.attendance()?.currentWeek ?? []);
  readonly overviewAttendanceBars = computed(() => {
    const week = this.attendanceWeek();
    if (week.length > 0) {
      return week.slice(0, 5).map((day) => ({
        label: day.dayLabel,
        value: this.isAttendanceStatus(day.status, 'presente')
          ? 100
          : this.isAttendanceStatus(day.status, 'atraso')
            ? 70
            : this.isAttendanceStatus(day.status, 'ausente')
              ? 36
              : 52,
        color: this.isAttendanceStatus(day.status, 'presente')
          ? '#22c55e'
          : this.isAttendanceStatus(day.status, 'atraso')
            ? '#f59e0b'
            : this.isAttendanceStatus(day.status, 'ausente')
              ? '#ef4444'
              : '#cbd5e1'
      }));
    }

    return [
      { label: 'Lun', value: 100, color: '#22c55e' },
      { label: 'Mar', value: 100, color: '#22c55e' },
      { label: 'Mié', value: 84, color: '#22c55e' },
      { label: 'Jue', value: 100, color: '#22c55e' },
      { label: 'Vie', value: 92, color: '#22c55e' }
    ];
  });
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
    },
    {
      title: 'Mi horario',
      description: 'Revisa tus bloques de hoy',
      route: '/alumno/horario',
      icon: 'calendar_month',
      tone: 'tone-brand'
    },
    {
      title: 'Actividades',
      description: `${this.dashboard()?.upcomingActivitiesCount ?? 0} actividad(es) disponibles`,
      route: '/alumno/actividades',
      icon: 'event',
      tone: 'tone-warning'
    }
  ]);
  readonly heroFullName = computed(() => this.dashboard()?.studentName ?? 'Estudiante');
  readonly heroMeta = computed(() => `${this.currentCourseLabel()} · ${this.dashboard()?.studentRun ?? 'Sin RUN'} · Torre Fuerte School`);
  readonly topGradeSubjects = computed(() => this.gradeSubjects().slice(0, 6));
  readonly overviewAcademicSubjects = computed(() => {
    const preferredOrder = ['Lenguaje', 'Matemática', 'Matemática', 'Ciencias'];
    const subjects = this.gradeSubjects();
    const selected = preferredOrder
      .map((name) => subjects.find((subject) => this.normalizeText(subject.subjectName).includes(this.normalizeText(name))))
      .filter((subject, index, array): subject is (typeof subjects)[number] => !!subject && array.indexOf(subject) === index);

    if (selected.length >= 3) {
      return selected.slice(0, 3);
    }

    return subjects.slice(0, 3);
  });
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
    return Array.from({ length: Math.min(maxEvaluations, 3) }, (_, index) => index);
  });
  readonly gradeSubjects = computed(() => {
    const palette = ['tone-brand', 'tone-success', 'tone-warning', 'tone-violet', 'tone-sky'];
    const icons = ['calculate', 'menu_book', 'public', 'science', 'translate'];
    const summaries = this.dashboard()?.gradeSummary ?? [];
    const registeredSubjectNames = Array.from(
      new Set(
        this.studentSubjects()
          .map((subject) => subject.subjectName?.trim())
          .filter((value): value is string => !!value)
      )
    );

    const baseSubjects = summaries.length > 0
      ? summaries.map((subject) => ({
          ...subject,
          evaluations: [...subject.evaluations]
        }))
      : (() => {
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

          return Array.from(grouped.values());
        })();

    const normalizedBaseMap = new Map(
      baseSubjects.map((subject) => [this.normalizeText(subject.subjectName), subject] as const)
    );

    const mergedSubjects = [
      ...baseSubjects,
      ...registeredSubjectNames
        .filter((subjectName) => !normalizedBaseMap.has(this.normalizeText(subjectName)))
        .map((subjectName) => ({
          subjectName,
          average: null,
          latestScore: null,
          evaluations: [] as {
            evaluationName: string;
            score: number | null;
            periodName: string;
            recordedAt: string;
          }[]
        }))
    ];

    return mergedSubjects.map((subject, index) => ({
      ...subject,
      tone: palette[index % palette.length],
      icon: icons[index % icons.length],
      visibleEvaluations: this.gradeColumns().map((columnIndex) => subject.evaluations[columnIndex] ?? null)
    }));
  });
  readonly semesterGradeSubjects = computed(() => {
    const semester = this.gradesSemesterFilter();

    return this.gradeSubjects()
      .map((subject) => {
        const evaluations = subject.evaluations.filter((evaluation) => this.matchesSemesterFilter(evaluation.periodName, semester));
        const validScores = evaluations
          .map((evaluation) => evaluation.score)
          .filter((value): value is number => value !== null);

        return {
          ...subject,
          evaluations,
          visibleEvaluations: this.gradeColumns().map((columnIndex) => evaluations[columnIndex] ?? null),
          average: validScores.length > 0
            ? Number((validScores.reduce((sum, value) => sum + value, 0) / validScores.length).toFixed(1))
            : null,
          latestScore: evaluations.at(-1)?.score ?? null
        };
      });
  });
  readonly gradesOverallAverage = computed(() => {
    const averages = this.semesterGradeSubjects()
      .map((subject) => subject.average)
      .filter((value): value is number => value !== null);
    if (averages.length === 0) {
      return '-';
    }
    return (averages.reduce((sum, value) => sum + value, 0) / averages.length).toFixed(1);
  });
  readonly totalEvaluationsCount = computed(() =>
    this.semesterGradeSubjects().reduce((sum, subject) => sum + subject.evaluations.length, 0)
  );
  readonly gradesHighlightedCount = computed(
    () => this.semesterGradeSubjects().filter((subject) => (subject.average ?? 0) >= 6.5).length
  );
  readonly gradesLatestScore = computed(() => {
    const scores = this.semesterGradeSubjects()
      .flatMap((subject) => subject.evaluations)
      .filter((evaluation) => evaluation.score !== null);
    return scores.at(-1)?.score ?? null;
  });
  readonly gradesBestSubject = computed(() => {
    const ordered = [...this.semesterGradeSubjects()]
      .filter((subject) => subject.average !== null)
      .sort((left, right) => (right.average ?? 0) - (left.average ?? 0));
    return ordered[0] ?? null;
  });
  readonly gradeSubjectOptions = computed(() => this.semesterGradeSubjects().map((subject) => subject.subjectName));
  readonly filteredGradeSubjects = computed(() => {
    const query = this.gradesSearch().trim().toLowerCase();
    const subjectFilter = this.gradesSubjectFilter();

    return this.semesterGradeSubjects().filter((subject) => {
      const matchesQuery =
        !query ||
        subject.subjectName.toLowerCase().includes(query) ||
        subject.evaluations.some((evaluation) => evaluation.evaluationName.toLowerCase().includes(query));
      const matchesSubject = subjectFilter === 'all' || subject.subjectName === subjectFilter;
      return matchesQuery && matchesSubject;
    });
  });
  readonly selectedGradeSubject = computed(() => {
    const selectedName = this.selectedGradeSubjectName();
    const filtered = this.filteredGradeSubjects();
    return filtered.find((subject) => subject.subjectName === selectedName) ?? filtered[0] ?? null;
  });
  readonly gradesRecentPublication = computed(() => this.recentGradeHistory()[0] ?? null);
  readonly reportSubjects = computed(() => {
    const subjectMap = new Map<string, {
      subjectName: string;
      teacherName: string;
      average: number | null;
      latestScore: number | null;
      evaluations: StudentGradeEvaluation[];
    }>();

    for (const subject of this.studentSubjects()) {
      subjectMap.set(subject.subjectName.trim().toLowerCase(), {
        subjectName: subject.subjectName,
        teacherName: subject.teacherName,
        average: null,
        latestScore: null,
        evaluations: []
      });
    }

    for (const summary of this.dashboard()?.gradeSummary ?? []) {
      const key = summary.subjectName.trim().toLowerCase();
      const current = subjectMap.get(key);
      subjectMap.set(key, {
        subjectName: summary.subjectName,
        teacherName: current?.teacherName ?? '',
        average: summary.average,
        latestScore: summary.latestScore,
        evaluations: summary.evaluations
      });
    }

    return Array.from(subjectMap.values())
      .sort((left, right) => left.subjectName.localeCompare(right.subjectName, 'es'));
  });
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
    const items = this.scheduleSourceItems();
    const courseBlocks = this.scheduleCourseBlocks();

    if (courseBlocks.length > 0) {
      const rowDefinitions = [...new Map(courseBlocks.map((block) => [`${block.order}-${block.startTime}-${block.endTime}`, block])).values()];

      return rowDefinitions.map((rowBlock) => ({
        startTime: rowBlock.startTime,
        endTime: rowBlock.endTime,
        blocks: this.scheduleDisplayWeekDays().map((day, index) => {
          const block = courseBlocks.find(
            (entry) => this.normalizeDayKey(entry.dayOfWeek) === day.key && entry.order === rowBlock.order
          );

          if (!block) {
            return {
              dayKey: day.key,
              item: null,
              tone: palette[index % palette.length]
            };
          }

          if (block.blockType === 'RECREO') {
            return {
              dayKey: day.key,
              item: {
                dayOfWeek: block.dayOfWeek,
                startTime: block.startTime,
                endTime: block.endTime,
                courseName: this.currentCourseLabel(),
                subjectName: 'Recreo',
                room: '',
                subjectColorHex: '#f5b642',
                teacherName: '',
                blockType: 'RECREO' as const,
                order: block.order,
                isCurrent:
                  this.toMinutes(block.startTime) <= this.nowMinutes() && this.nowMinutes() < this.toMinutes(block.endTime),
                isPast: this.toMinutes(block.endTime) < this.nowMinutes()
              },
              tone: palette[index % palette.length]
            };
          }

          const item =
            items.find(
              (entry) =>
                this.normalizeDayKey(entry.dayOfWeek) === day.key &&
                ((entry.order != null && entry.order === block.order) ||
                  (entry.startTime === block.startTime && entry.endTime === block.endTime))
            ) ?? null;

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
        })
      }));
    }

    const startTimes = [...new Set(items.map((item) => item.startTime))].sort((left, right) => this.toMinutes(left) - this.toMinutes(right));
    const fallbackStarts = ['08:00', '08:45', '09:30', '10:15', '10:35', '11:20', '12:05', '12:50'];
    const visibleStarts = startTimes.length > 0 ? startTimes : fallbackStarts;

    return visibleStarts.map((startTime, rowIndex) => {
      const rowBlocks = this.scheduleDisplayWeekDays().map((day, index) => {
        const item =
          items.find((block) => this.normalizeDayKey(block.dayOfWeek) === day.key && block.startTime === startTime) ?? null;

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
  readonly scheduleDisplayWeekDays = computed(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const monthFormatter = new Intl.DateTimeFormat('es-CL', { month: 'short' });
    const todayKey = this.normalizeDayKey(new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(now));

    if (this.scheduleSourceItems().length === 0 && this.scheduleCourseBlocks().length === 0) {
      return [];
    }

    return [
      { key: 'LUNES', fullLabel: 'Lunes' },
      { key: 'MARTES', fullLabel: 'Martes' },
      { key: 'MIERCOLES', fullLabel: 'Miércoles' },
      { key: 'JUEVES', fullLabel: 'Jueves' },
      { key: 'VIERNES', fullLabel: 'Viernes' }
    ].map((dayConfig, index) => {
      const currentDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);

      return {
        key: dayConfig.key,
        fullLabel: dayConfig.fullLabel,
        dayNumber: currentDate.getDate(),
        monthLabel: monthFormatter.format(currentDate).replace('.', ''),
        isToday: dayConfig.key === todayKey
      };
    });
  });
  readonly activeScheduleMobileDay = computed(
    () => this.scheduleDisplayWeekDays().find((day) => day.key === this.selectedScheduleMobileDay())?.key
      ?? this.scheduleDisplayWeekDays().find((day) => day.isToday)?.key
      ?? this.scheduleDisplayWeekDays()[0]?.key
      ?? 'LUNES'
  );
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
  readonly scheduleNextClass = computed(() => {
    const todayItems = this.todaySchedule();
    const nextItem = todayItems.find((item) => item.isCurrent) ?? todayItems.find((item) => !item.isPast) ?? null;

    if (!nextItem) {
      return null;
    }

    const currentMinutes = this.nowMinutes();
    const minutesUntil = Math.max(0, this.toMinutes(nextItem.startTime) - currentMinutes);

    return {
      ...nextItem,
      badge: nextItem.isCurrent ? 'En curso' : minutesUntil > 0 ? `En ${minutesUntil} min` : 'Próxima',
      progress: `${Math.max(18, Math.min(100, ((todayItems.indexOf(nextItem) + 1) / Math.max(todayItems.length, 1)) * 100))}%`
    };
  });
  readonly scheduleTodayTimeline = computed(() => {
    const todayItems = this.todaySchedule();
    const nextUpcomingIndex = todayItems.findIndex((item) => !item.isPast && !item.isCurrent);

    return todayItems.map((item, index) => ({
      ...item,
      statusLabel: item.isCurrent
        ? 'En curso'
        : this.isSchedulePause(item.subjectName)
          ? 'Descanso'
          : index === nextUpcomingIndex
            ? 'Siguiente'
            : '',
      statusTone: item.isCurrent
        ? 'success'
        : this.isSchedulePause(item.subjectName)
          ? 'rest'
          : index === nextUpcomingIndex
            ? 'next'
            : 'none'
    }));
  });
  readonly scheduleWeeklySummary = computed(() => {
    const lessonBlocks = (this.dashboard()?.weeklySchedule ?? []).filter((item) => !this.isSchedulePause(item.subjectName));
    const totalMinutes = lessonBlocks.reduce(
      (sum, item) => sum + Math.max(0, this.toMinutes(item.endTime) - this.toMinutes(item.startTime)),
      0
    );
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return {
      totalClasses: lessonBlocks.length,
      totalHoursLabel: remainingMinutes > 0 ? `${totalHours} h ${remainingMinutes} min` : `${totalHours} h`,
      subjectsCount: new Set(lessonBlocks.map((item) => this.normalizeDayKey(item.subjectName))).size
    };
  });

  constructor() {
    this.activatedRoute.data.subscribe((data) => {
      this.activeSection.set((data['section'] as StudentSection | undefined) ?? 'overview');
    });
    this.loadDashboard();
    this.startOverviewTabRotation();
  }

  ngOnDestroy(): void {
    this.stopOverviewTabRotation();
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

  selectOverviewTab(tab: DashboardOverviewTab): void {
    this.overviewTabAutoEnabled = false;
    this.selectedOverviewTab.set(tab);
  }

  previousOverviewSchedulePage(): void {
    this.overviewSchedulePage.update((page) => Math.max(0, page - 1));
  }

  nextOverviewSchedulePage(): void {
    this.overviewSchedulePage.update((page) => Math.min(this.overviewSchedulePageCount() - 1, page + 1));
  }

  updateStudentSearch(value: string): void {
    this.studentSearch.set(value);
  }

  openReportPreview(): void {
    this.isReportPreviewOpen.set(true);
  }

  closeReportPreview(): void {
    this.isReportPreviewOpen.set(false);
  }

  async downloadStudentSchedulePdf(): Promise<void> {
    const exportTarget = this.studentSchedulePdfRef?.nativeElement;
    if (!exportTarget || this.scheduleWeekDays().length === 0 || this.isExportingSchedulePdf()) {
      this.snackBar.open('El horario todavía no está listo para exportar', 'Cerrar', { duration: 2600 });
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

  async downloadStudentReportPdf(): Promise<void> {
    const exportTarget = this.studentReportPdfRef?.nativeElement;
    if (!exportTarget || this.isExportingReportPdf()) {
      this.snackBar.open('El informe todavía no está listo para exportar', 'Cerrar', { duration: 2600 });
      return;
    }

    try {
      this.isExportingReportPdf.set(true);

      const canvas = await html2canvas(exportTarget, {
        backgroundColor: '#ffffff',
        scale: 2.4,
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
      const renderedHeight = (canvas.height * printableWidth) / canvas.width;
      const pageCanvasHeight = Math.floor((canvas.width * (pageHeight - margin * 2)) / printableWidth);

      let renderedOffset = 0;
      let firstPage = true;

      while (renderedOffset < canvas.height) {
        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedOffset);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const context = pageCanvas.getContext('2d');
        if (!context) {
          throw new Error('No fue posible generar el contexto del PDF');
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(
          canvas,
          0,
          renderedOffset,
          canvas.width,
          sliceHeight,
          0,
          0,
          pageCanvas.width,
          pageCanvas.height
        );

        if (!firstPage) {
          pdf.addPage();
        }

        const imageHeight = (sliceHeight * printableWidth) / canvas.width;
        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, printableWidth, imageHeight, undefined, 'FAST');

        renderedOffset += sliceHeight;
        firstPage = false;
      }

      pdf.save(this.buildStudentReportPdfName());
      this.snackBar.open('Informe de notas exportado en PDF', 'Cerrar', { duration: 2600 });
    } catch {
      this.snackBar.open('No fue posible exportar el informe de notas', 'Cerrar', { duration: 3200 });
    } finally {
      this.isExportingReportPdf.set(false);
    }
  }

  reportSubjectScore(subjectName: string, index: number): number | null {
    return this.reportSubjects()
      .find((subject) => subject.subjectName === subjectName)
      ?.evaluations[index]?.score ?? null;
  }

  reportSubjectAverage(subject: { average: number | null }): number | null {
    return subject.average ?? null;
  }

  reportConcept(value: number | null | undefined): string {
    if (value == null) {
      return 'Pendiente';
    }
    if (value >= 6) {
      return 'Destacado';
    }
    if (value >= 4) {
      return 'Logrado';
    }
    return 'En riesgo';
  }

  reportConceptClass(value: number | null | undefined): string {
    if (value == null) {
      return 'is-empty';
    }
    if (value >= 6) {
      return 'is-high';
    }
    if (value >= 4) {
      return 'is-mid';
    }
    return 'is-low';
  }

  reportAcademicStatus(): string {
    const average = this.averageValue();
    return average != null && average >= 4 ? 'APROBADO' : 'EN REVISION';
  }

  reportAcademicStatusClass(): string {
    const average = this.averageValue();
    return average != null && average >= 4 ? 'is-approved' : 'is-review';
  }

  reportIssueDate(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }

  reportSchoolYear(): string {
    return this.currentYearLabel();
  }

  reportStudentRun(): string {
    return this.dashboard()?.studentRun ?? '';
  }

  reportAttendancePercentage(): number {
    return this.dashboard()?.attendancePercentage ?? 0;
  }

  reportCourseLabel(): string {
    return this.currentCourseLabel();
  }

  reportTeacherName(subjectName?: string): string {
    if (subjectName) {
      const teacher = this.studentSubjects().find((subject) => subject.subjectName === subjectName)?.teacherName?.trim();
      if (teacher) {
        return teacher;
      }
    }

    return this.studentSubjects().find((subject) => !!subject.teacherName?.trim())?.teacherName?.trim() || 'Profesor jefe';
  }

  reportText(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  reportScore(value: number | null | undefined): string {
    return value == null ? '-' : value.toFixed(1).replace('.', ',');
  }

  reportAverageWidth(value: number | null | undefined): number {
    if (value == null) {
      return 0;
    }
    return Math.max(0, Math.min(100, (value / 7) * 100));
  }

  reportObservationLines(): string[] {
    const total = this.reportSubjects().length;
    const completed = this.reportSubjects().filter((subject) => subject.average != null).length;
    const generalAverage = this.averageValue();

    const lines = [
      total === 0
        ? 'Sin asignaturas registradas para este período.'
        : `${completed} de ${total} asignaturas con promedio registrado.`,
      generalAverage == null
        ? 'Aún no registra notas en este período.'
        : generalAverage >= 6
          ? 'Presenta un rendimiento destacado en el período actual.'
          : generalAverage >= 4
            ? 'Mantiene un rendimiento estable con oportunidades de mejora.'
            : 'Requiere acompanamiento en asignaturas clave.',
      `Documento generado automáticamente desde ConectaSchool el ${this.reportIssueDate()}.`
    ];

    return lines.map((line) => this.reportText(line));
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

  selectGradeSubject(subjectName: string): void {
    this.selectedGradeSubjectName.set(subjectName);
  }

  updateGradesSearch(value: string): void {
    this.gradesSearch.set(value);
  }

  updateGradesSubjectFilter(value: string): void {
    this.gradesSubjectFilter.set(value);
  }

  updateGradesSemesterFilter(value: GradeSemesterFilter): void {
    if (this.gradesSemesterFilter() === value) {
      return;
    }

    this.gradesSemesterFilter.set(value);
    this.gradesSubjectFilter.set('all');
    this.selectedGradeSubjectName.set(null);
    this.loadDashboard(value, false);
  }

  gradeStatusLabel(subject: { average: number | null }): string {
    if (subject.average === null) {
      return 'Pendiente';
    }
    if (subject.average >= 6.8) {
      return 'Excelente';
    }
    if (subject.average >= 6.5) {
      return 'Destacada';
    }
    return 'Al dia';
  }

  gradeStatusClass(subject: { average: number | null }): string {
    if (subject.average === null) {
      return 'status-pending';
    }
    if (subject.average >= 6.8) {
      return 'status-excellent';
    }
    if (subject.average >= 6.5) {
      return 'status-featured';
    }
    return 'status-day';
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

  isSchedulePause(subjectName: string): boolean {
    const normalized = this.normalizeDayKey(subjectName);
    return normalized.includes('RECRE') || normalized.includes('ALMUER') || normalized.includes('COLAC');
  }

  scheduleTeacherName(subjectName: string): string {
    return this.studentSubjects().find((subject) => subject.subjectName === subjectName)?.teacherName || 'Docente asignado';
  }

  shortTeacherName(subjectName: string): string {
    const teacherName = this.scheduleTeacherName(subjectName).trim();
    const parts = teacherName.split(/\s+/).filter(Boolean);

    if (parts.length <= 2) {
      return teacherName;
    }

    return `${parts[0]} ${parts[parts.length - 1]}`;
  }

  scheduleTeacherLabel(item: { subjectName: string; teacherName?: string | null }): string {
    const teacherName = (item.teacherName?.trim() || this.scheduleTeacherName(item.subjectName)).trim();
    const parts = teacherName.split(/\s+/).filter(Boolean);

    if (parts.length <= 2) {
      return teacherName;
    }

    return `${parts[0]} ${parts[parts.length - 1]}`;
  }

  setScheduleMobileDay(dayKey: string): void {
    this.selectedScheduleMobileDay.set(dayKey);
  }

  scheduleMobileDayLabel(dayKey: string): string {
    switch (this.normalizeDayKey(dayKey)) {
      case 'LUNES':
        return 'Lun';
      case 'MARTES':
        return 'Mar';
      case 'MIERCOLES':
        return 'Mie';
      case 'JUEVES':
        return 'Jue';
      case 'VIERNES':
        return 'Vie';
      default:
        return dayKey.slice(0, 3);
    }
  }

  isScheduleBreakRow(row: {
    blocks: Array<{ item: { subjectName: string; blockType?: 'CLASE' | 'RECREO' } | null }>;
  }): boolean {
    return row.blocks.some((block) => {
      if (!block.item) {
        return false;
      }

      return block.item.blockType === 'RECREO' || this.isSchedulePause(block.item.subjectName);
    });
  }

  scheduleEntryForDay(
    row: {
      blocks: Array<{ dayKey: string; item: StudentScheduleViewItem | ({ isCurrent: boolean; isPast: boolean } & StudentScheduleViewItem) | null }>;
    },
    dayKey: string
  ): StudentScheduleViewItem | ({ isCurrent: boolean; isPast: boolean } & StudentScheduleViewItem) | null {
    return row.blocks.find((block) => block.dayKey === dayKey)?.item ?? null;
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

  private isAttendanceStatus(value: string | null | undefined, expected: 'presente' | 'atraso' | 'ausente'): boolean {
    return this.normalizeText(value ?? '').trim() === expected;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
    return (hours || 0) * 60 + (minutes || 0);
  }

  private loadDashboard(semesterOverride?: GradeSemesterFilter, showPageLoading = true): void {
    if (showPageLoading) {
      this.isLoading.set(true);
    }
    const requestedSemester = Number.parseInt(semesterOverride ?? this.gradesSemesterFilter(), 10);
    const requestedSchoolYear = new Date().getFullYear();

    this.studentApiService.getDashboard(requestedSemester, requestedSchoolYear).subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        const courseId = dashboard.enrolledCourses[0]?.id ?? null;
        if (courseId) {
          this.loadStudentCourseSchedule(courseId);
        } else {
          this.studentScheduleCatalog.set(null);
          this.studentScheduleEntries.set([]);
          this.studentSchedulePeriodId.set(null);
        }
        if (showPageLoading) {
          this.isLoading.set(false);
        }
      },
      error: (error: HttpErrorResponse) => {
        if (showPageLoading) {
          this.isLoading.set(false);
        }
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
      : 'No fue posible cargar el resumen del estudiante',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });

    if (showPageLoading) {
      this.studentApiService.getStudentSubjects().subscribe({
        next: (subjects) => this.studentSubjects.set(subjects),
        error: () => this.studentSubjects.set([])
      });

      this.studentApiService.getStudentAttendance().subscribe({
        next: (attendance) => this.attendance.set(attendance),
        error: () => this.attendance.set(null)
      });
    }
  }

  private startOverviewTabRotation(): void {
    this.stopOverviewTabRotation();
    this.overviewTabRotationId = window.setInterval(() => {
      if (!this.overviewTabAutoEnabled || this.activeSection() !== 'overview') {
        return;
      }

      const order: DashboardOverviewTab[] = ['grades', 'performance', 'attendance'];
      const currentIndex = order.indexOf(this.selectedOverviewTab());
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % order.length : 0;
      this.selectedOverviewTab.set(order[nextIndex]);
    }, 10000);
  }

  private stopOverviewTabRotation(): void {
    if (this.overviewTabRotationId !== null) {
      window.clearInterval(this.overviewTabRotationId);
      this.overviewTabRotationId = null;
    }
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

  private loadStudentCourseSchedule(courseId: number): void {
    this.scheduleApiService.getCatalog(courseId).subscribe({
      next: (catalog) => {
        this.studentScheduleCatalog.set(catalog);
        const periodId = this.resolvePreferredStudentSchedulePeriodId(catalog);
        this.studentSchedulePeriodId.set(periodId);

        if (!periodId) {
          this.studentScheduleEntries.set([]);
          return;
        }

        this.scheduleApiService.getByCourse(courseId, periodId).subscribe({
          next: (entries) => this.studentScheduleEntries.set(entries),
          error: () => this.studentScheduleEntries.set([])
        });
      },
      error: () => {
        this.studentScheduleCatalog.set(null);
        this.studentScheduleEntries.set([]);
        this.studentSchedulePeriodId.set(null);
      }
    });
  }

  private resolvePreferredStudentSchedulePeriodId(catalog: ScheduleCatalog): number | null {
    const currentYear = new Date().getFullYear();
    const currentSemester = resolveCurrentAcademicSemester();
    const preferredPeriod = catalog.periods.find(
      (period) => period.schoolYear === currentYear && period.semester === currentSemester
    );
    if (preferredPeriod) {
      return preferredPeriod.id;
    }

    const firstSemesterForYear = catalog.periods.find(
      (period) => period.schoolYear === currentYear && period.semester === 1
    );
    if (firstSemesterForYear) {
      return firstSemesterForYear.id;
    }

    const firstSemester = catalog.periods.find((period) => period.semester === 1);
    return firstSemester?.id ?? catalog.periods[0]?.id ?? null;
  }

  private normalizeDayKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private matchesSemesterFilter(periodName: string | null | undefined, semester: GradeSemesterFilter): boolean {
    const normalized = this.normalizeText(periodName ?? '');
    if (!normalized) {
      return true;
    }

    if (semester === '1') {
      return normalized.includes('1') || normalized.includes('primer');
    }

    return normalized.includes('2') || normalized.includes('segúndo');
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

  private buildStudentReportPdfName(): string {
    const nameToken = this.fullStudentName()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return `informe-notas-${nameToken || 'estudiante'}.pdf`;
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
