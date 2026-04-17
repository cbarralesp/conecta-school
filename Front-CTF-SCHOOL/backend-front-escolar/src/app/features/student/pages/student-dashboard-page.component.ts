import { HttpErrorResponse } from '@angular/common/http';
import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StudentDashboard, StudentPortalSubject } from '../../../core/models/student.models';
import { AuthService } from '../../../core/services/auth.service';
import { StudentApiService } from '../../../core/services/student-api.service';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

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
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    MatSnackBarModule,
    UpperCasePipe,
    TeacherSideMenuComponent
  ],
  templateUrl: './student-dashboard-page.component.html',
  styleUrl: './student-dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(true);
  readonly dashboard = signal<StudentDashboard | null>(null);
  readonly studentSubjects = signal<StudentPortalSubject[]>([]);
  readonly activeSection = signal<StudentSection>('overview');
  readonly studentSearch = signal('');

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
      title: 'Calificaciones',
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
  readonly overviewActivities = computed(() => (this.dashboard()?.upcomingActivities ?? []).slice(0, 3));
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

    const days = [...new Set((this.dashboard()?.weeklySchedule ?? []).map((item) => item.dayOfWeek.toUpperCase()))];

    return days
      .sort((left, right) => dayOrder.indexOf(left) - dayOrder.indexOf(right))
      .map((dayKey, index) => ({
        key: dayKey,
        shortLabel: labels.get(dayKey) ?? dayKey.slice(0, 3),
        dayNumber: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index).getDate()
      }));
  });
  readonly scheduleRows = computed(() => {
    const palette = ['tone-brand', 'tone-success', 'tone-violet', 'tone-warning', 'tone-sky'];
    const blocks = this.dashboard()?.weeklySchedule ?? [];
    const startTimes = blocks.map((item) => item.startTime);
    const endTimes = blocks.map((item) => item.endTime);
    const allTimes = [...startTimes];
    const latestEnd = endTimes.sort((left, right) => this.toMinutes(left) - this.toMinutes(right)).at(-1);

    if (latestEnd && !allTimes.includes(latestEnd)) {
      allTimes.push(latestEnd);
    }

    const sortedTimes = [...new Set(allTimes)].sort((left, right) => this.toMinutes(left) - this.toMinutes(right));
    const uniqueTimes = sortedTimes.length > 0 ? sortedTimes : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:30'];

    return uniqueTimes.map((startTime) => ({
      startTime,
      blocks: this.scheduleWeekDays().map((day, index) => ({
        dayKey: day.key,
        item:
          blocks.find((block) => block.dayOfWeek.toUpperCase() === day.key && block.startTime === startTime) ?? null,
        tone: palette[index % palette.length]
      }))
    }));
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
  }
}
