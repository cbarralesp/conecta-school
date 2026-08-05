import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { switchMap } from 'rxjs';
import { StatisticsCourse } from '../../../core/models/statistics.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { StatisticsApiService } from '../../../core/services/statistics-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type StatisticsLevelId = 'parvularia' | 'basica' | 'media';
type StatisticsTone = 'blue' | 'green' | 'orange' | 'purple' | 'rose' | 'cyan';
type StatisticsSemester = 1 | 2;

type StatisticsLevel = {
  id: StatisticsLevelId;
  title: string;
  subtitle: string;
  icon: string;
  tone: StatisticsTone;
};

type StatisticsLevelDetail = {
  level: StatisticsLevel;
  courses: StatisticsCourse[];
};

type StatisticsHighlight = {
  label: string;
  value: number;
  supporting: string;
  icon: string;
  tone: StatisticsTone;
};

type StatisticsPeriodRange = {
  shortLabel: string;
  longLabel: string;
};

type StatisticsMonthlyPoint = {
  label: string;
  valueLabel: string;
  hasData: boolean;
};

const LEVEL_CONFIG: Record<StatisticsLevelId, StatisticsLevel> = {
  parvularia: {
    id: 'parvularia',
    title: 'Educacion Parvularia',
    subtitle: 'Prekinder - Kinder',
    icon: 'toys',
    tone: 'rose'
  },
  basica: {
    id: 'basica',
    title: 'Educacion Basica',
    subtitle: '1° Basico - 6° Basico',
    icon: 'school',
    tone: 'green'
  },
  media: {
    id: 'media',
    title: 'Educacion Media',
    subtitle: '7° Basico - IV Medio',
    icon: 'auto_stories',
    tone: 'purple'
  }
};

const LEVEL_ORDER: StatisticsLevelId[] = ['parvularia', 'basica', 'media'];

const EMPTY_COURSE: StatisticsCourse = {
  id: 0,
  name: '',
  students: 0,
  teacher: '',
  averageAttendance: 0,
  averageGrade: 0,
  planningProgress: 0,
  annotations: 0,
  annotationDelta: 0,
  attendanceDelta: 0,
  gradeDelta: 0,
  planningDelta: 0,
  attendanceBreakdown: [],
  attendanceSeries: [0, 0, 0, 0, 0],
  gradeSeries: [null, null, null, null, null],
  planningSeries: [0, 0, 0, 0, 0],
  planningSummary: { completed: 0, inProgress: 0, pending: 0 },
  annotationSeries: [0, 0, 0, 0, 0],
  evaluationsCount: 0,
  publishedActivitiesCount: 0,
  sharedResourcesCount: 0,
  standoutStudentsCount: 0
};

const EMPTY_LEVEL: StatisticsLevelDetail = {
  level: LEVEL_CONFIG.basica,
  courses: []
};

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [FormsModule, MatIconModule, TeacherModernLayoutComponent],
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsPageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly statisticsApiService = inject(StatisticsApiService);
  private readonly visibleCourseCardsCount = 4;
  readonly selectedSemester = signal<StatisticsSemester>(this.resolveCurrentSemester());
  private readonly semesterWasManuallySelected = signal(false);
  private readonly automaticSemesterFallbackApplied = signal(false);
  private readonly statisticsResponse = toSignal(
    toObservable(this.selectedSemester).pipe(
      switchMap((semester) => this.statisticsApiService.getStatistics(semester))
    ),
    { initialValue: null }
  );

  readonly user = this.authStateService.user;
  readonly semesterOptions = [
    { value: 1 as const, label: 'Primer semestre' },
    { value: 2 as const, label: 'Segundo semestre' }
  ];
  readonly isLoading = computed(() => this.statisticsResponse() === null);
  readonly periodLabel = computed(() => this.statisticsResponse()?.periodLabel ?? 'Este semestre');
  readonly periodRange = computed<StatisticsPeriodRange>(() => {
    if (this.selectedSemester() === 1) {
      return {
        shortLabel: 'Mar-Jun 2026',
        longLabel: 'Datos acumulados de marzo a junio de 2026'
      };
    }

    return {
      shortLabel: 'Jul-Dic 2026',
      longLabel: 'Datos acumulados de julio a diciembre de 2026'
    };
  });
  readonly hasMeaningfulStatistics = computed(() =>
    (this.statisticsResponse()?.levels ?? []).some((level) =>
      (level.courses ?? []).some((course) =>
        course.averageAttendance > 0
        || course.averageGrade > 0
        || course.planningProgress > 0
        || course.annotations > 0
        || course.evaluationsCount > 0
        || course.publishedActivitiesCount > 0
        || course.sharedResourcesCount > 0
        || course.standoutStudentsCount > 0
        || course.planningSummary.completed > 0
        || course.planningSummary.inProgress > 0
        || course.planningSummary.pending > 0
      )
    )
  );
  readonly chartLabels = computed(() => {
    const labels = this.statisticsResponse()?.chartLabels ?? [];
    if (labels.length) {
      return labels;
    }

    return this.selectedSemester() === 1
      ? ['Mar', 'Abr', 'May', 'Jun']
      : ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  });
  readonly levels = computed<StatisticsLevelDetail[]>(() =>
    LEVEL_ORDER
      .map((levelId) => {
        const backendLevel = this.statisticsResponse()?.levels.find((level) => level.id === levelId);
        return backendLevel
          ? {
              level: LEVEL_CONFIG[levelId],
              courses: backendLevel.courses
            }
          : null;
      })
      .filter((level): level is StatisticsLevelDetail => level !== null && level.courses.length > 0)
  );
  readonly hasData = computed(() => this.levels().length > 0);

  readonly selectedLevelId = signal<StatisticsLevelId | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly coursePageIndex = signal(0);

  readonly selectedLevel = computed(() => {
    const levels = this.levels();
    return levels.find((item) => item.level.id === this.selectedLevelId()) ?? levels[0] ?? EMPTY_LEVEL;
  });
  readonly totalCoursePages = computed(() =>
    Math.max(1, Math.ceil(this.selectedLevel().courses.length / this.visibleCourseCardsCount))
  );
  readonly visibleCourses = computed(() => {
    const start = this.coursePageIndex() * this.visibleCourseCardsCount;
    return this.selectedLevel().courses.slice(start, start + this.visibleCourseCardsCount);
  });
  readonly canGoToPreviousCoursePage = computed(() => this.coursePageIndex() > 0);
  readonly canGoToNextCoursePage = computed(() => this.coursePageIndex() < this.totalCoursePages() - 1);
  readonly selectedCourse = computed(() => {
    const courses = this.selectedLevel().courses;
    return courses.find((course) => course.id === this.selectedCourseId()) ?? courses[0] ?? EMPTY_COURSE;
  });
  readonly gradeChartPoints = computed(() => this.buildLinePoints(this.selectedCourse().gradeSeries, 240, 116));
  readonly annotationBarHeights = computed(() => this.buildBarHeights(this.selectedCourse().annotationSeries));
  readonly attendanceMonthlyPoints = computed(() =>
    this.buildMonthlyPoints(this.selectedCourse().attendanceSeries, (value) => `${value}%`)
  );
  readonly gradeMonthlyPoints = computed(() =>
    this.buildMonthlyPoints(this.selectedCourse().gradeSeries, (value) => this.formatGrade(value))
  );
  readonly planningMonthlyPoints = computed(() =>
    this.buildMonthlyPoints(this.selectedCourse().planningSeries, (value) => `${value}%`)
  );
  readonly annotationMonthlyPoints = computed(() =>
    this.buildMonthlyPoints(this.selectedCourse().annotationSeries, (value) => String(value))
  );
  readonly planningSegments = computed(() => {
    const summary = this.selectedCourse().planningSummary;
    return [
      { label: 'Completadas', value: summary.completed, tone: 'purple' as const },
      { label: 'En progreso', value: summary.inProgress, tone: 'orange' as const },
      { label: 'Pendientes', value: summary.pending, tone: 'rose' as const }
    ];
  });
  readonly courseHighlights = computed<StatisticsHighlight[]>(() => {
    const course = this.selectedCourse();
    return [
      { label: 'Evaluaciones realizadas', value: course.evaluationsCount, supporting: 'Este periodo', icon: 'task_alt', tone: 'green' },
      { label: 'Actividades publicadas', value: course.publishedActivitiesCount, supporting: 'Este periodo', icon: 'calendar_month', tone: 'blue' },
      { label: 'Recursos compartidos', value: course.sharedResourcesCount, supporting: 'Este periodo', icon: 'folder_copy', tone: 'purple' },
      { label: 'Estudiantes destacados', value: course.standoutStudentsCount, supporting: 'Por su rendimiento', icon: 'star', tone: 'orange' }
    ];
  });

  constructor() {
    effect(() => {
      const levels = this.levels();
      const selectedLevelId = this.selectedLevelId();
      const selectedCourseId = this.selectedCourseId();

      if (!levels.length) {
        this.coursePageIndex.set(0);
        return;
      }

      const activeLevel = levels.find((level) => level.level.id === selectedLevelId) ?? levels[0];
      if (selectedLevelId !== activeLevel.level.id) {
        this.selectedLevelId.set(activeLevel.level.id);
      }

      const activeCourse = activeLevel.courses.find((course) => course.id === selectedCourseId) ?? activeLevel.courses[0] ?? null;
      if (selectedCourseId !== activeCourse?.id) {
        this.selectedCourseId.set(activeCourse?.id ?? null);
      }

      const totalPages = Math.max(1, Math.ceil(activeLevel.courses.length / this.visibleCourseCardsCount));
      if (this.coursePageIndex() > totalPages - 1) {
        this.coursePageIndex.set(0);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const response = this.statisticsResponse();
      if (response == null || this.semesterWasManuallySelected() || this.automaticSemesterFallbackApplied()) {
        return;
      }

      if (this.hasMeaningfulStatistics()) {
        return;
      }

      const currentSemester = this.resolveCurrentSemester();
      if (this.selectedSemester() !== currentSemester) {
        return;
      }

      this.automaticSemesterFallbackApplied.set(true);
      this.selectedSemester.set(currentSemester === 1 ? 2 : 1);
      this.selectedLevelId.set(null);
      this.selectedCourseId.set(null);
      this.coursePageIndex.set(0);
    }, { allowSignalWrites: true });
  }

  selectLevel(levelId: StatisticsLevelId): void {
    if (this.selectedLevelId() === levelId) {
      return;
    }

    this.selectedLevelId.set(levelId);
    this.coursePageIndex.set(0);
    const selectedLevel = this.levels().find((item) => item.level.id === levelId);
    this.selectedCourseId.set(selectedLevel?.courses[0]?.id ?? null);
  }

  selectCourse(courseId: number): void {
    this.selectedCourseId.set(courseId);
  }

  selectSemester(value: StatisticsSemester | string | number): void {
    const normalized = Number(value) === 2 ? 2 : 1;
    if (this.selectedSemester() === normalized) {
      return;
    }

    this.semesterWasManuallySelected.set(true);
    this.selectedSemester.set(normalized);
    this.selectedLevelId.set(null);
    this.selectedCourseId.set(null);
    this.coursePageIndex.set(0);
  }

  goToPreviousCoursePage(): void {
    if (!this.canGoToPreviousCoursePage()) {
      return;
    }

    this.coursePageIndex.update((value) => value - 1);
  }

  goToNextCoursePage(): void {
    if (!this.canGoToNextCoursePage()) {
      return;
    }

    this.coursePageIndex.update((value) => value + 1);
  }

  absoluteValue(value: number): number {
    return Math.abs(value);
  }

  isPositive(value: number): boolean {
    return value >= 0;
  }

  trackByLevel(_: number, item: StatisticsLevelDetail): StatisticsLevelId {
    return item.level.id;
  }

  trackByCourse(_: number, item: StatisticsCourse): number {
    return item.id;
  }

  trackByLabel(_: number, item: { label: string }): string {
    return item.label;
  }

  formatGrade(value: number | null | undefined): string {
    if (value == null) {
      return 'Sin datos';
    }

    return value.toFixed(1);
  }

  private buildLinePoints(values: Array<number | null>, width: number, height: number): string {
    const definedPoints = values
      .map((value, index) => ({ value, index }))
      .filter((point): point is { value: number; index: number } => point.value != null);

    if (definedPoints.length === 0) {
      return '';
    }

    const numericValues = definedPoints.map((point) => point.value);
    const min = Math.min(...numericValues) - 0.4;
    const max = Math.max(...numericValues) + 0.4;
    const range = Math.max(max - min, 0.1);

    const points = definedPoints.map(({ value, index }) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      });

    return points.length === 1 ? `${points[0]} ${points[0]}` : points.join(' ');
  }

  private buildBarHeights(values: number[]): number[] {
    if (values.length === 0) {
      return [];
    }

    const max = Math.max(...values);
    if (max <= 0) {
      return values.map(() => 18);
    }

    return values.map((value) => Math.max(18, Math.round((value / max) * 100)));
  }

  private buildMonthlyPoints(
    values: ReadonlyArray<number | null>,
    formatter: (value: number | null) => string
  ): StatisticsMonthlyPoint[] {
    const labels = this.chartLabels();
    return labels.map((label, index) => ({
      label,
      valueLabel: formatter(values[index] ?? null),
      hasData: values[index] != null
    }));
  }

  private resolveCurrentSemester(): StatisticsSemester {
    return new Date().getMonth() + 1 >= 7 ? 2 : 1;
  }
}
