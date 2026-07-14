import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdministrationConfirmDialogComponent } from '../../administration/components/administration-confirm-dialog.component';
import {
  PlanningClass,
  PlanningClassDocument,
  PlanningSummary,
  PlanningSummaryUnit,
  PlanningUnitCatalogAssignment
} from '../../../core/models/planning.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { Course } from '../../../core/models/course.models';
import { Subject } from '../../../core/models/subject.models';
import { CourseApiService } from '../../../core/services/course-api.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { SubjectApiService } from '../../../core/services/subject-api.service';
import { resolveCurrentAcademicSemester } from '../../../core/utils/academic-semester';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type PlanningTab = 'units' | 'schedule' | 'class-by-class' | 'evaluations';

type FilterOption<T extends string | number> = {
  value: T;
  label: string;
};

type SummaryItem = {
  label: string;
  value: string;
  icon: string;
  tone: 'violet' | 'blue' | 'amber' | 'emerald' | 'gray';
};

type PlanningUnitCard = {
  id: number;
  unitNumber: number | null;
  title: string;
  period: string;
  weekRange: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  classes: number;
  plannedClasses: number;
  resources: number;
  coverage: number;
  tone: 'violet' | 'emerald' | 'amber' | 'blue';
  accentColor: string;
  accentSurface: string;
  accentSurfaceStrong: string;
  statusLabel: string;
  classRows: PlanningUnitClassRow[];
};

type PlanningUnitClassRow = {
  id: number | null;
  unitId: number;
  number: number;
  title: string;
  tone: PlanningUnitCard['tone'];
  accentColor: string;
  accentSurface: string;
  isEvaluation: boolean;
  objectiveCode: string;
  objective: string;
  objectiveSummary: string;
  statusLabel: string;
  statusTone: 'planned' | 'progress' | 'completed';
  documentsCount: number;
  documents: PlanningClassDocument[];
};

type ClassPreviewObjective = {
  code: string;
  description: string;
  indicators: string[];
};

type ClassPreviewPhase = {
  title: string;
  tone: 'violet' | 'emerald' | 'amber';
  description: string;
  duration: string;
};

type ClassByClassCard = {
  id: string;
  classId: number | null;
  unitId: number;
  unitNumber: number | null;
  unitTitle: string;
  unitTone: PlanningUnitCard['tone'];
  classNumber: number;
  title: string;
  objective: string;
  objectiveDisplay: string;
  objectiveCode: string;
  statusLabel: string;
  statusTone: PlanningUnitClassRow['statusTone'];
  durationLabel: string;
  dateLabel: string;
  resourcesLabel: string;
  unitLabel: string;
};

type ScheduleMonth = {
  label: string;
  startWeek: number;
  span: number;
};

type ScheduleItem = {
  id: number;
  titulo: string;
  semana: number;
  tipo: 'clase' | 'evaluacion';
};

type ScheduleUnit = {
  id: number;
  numero: number;
  nombre: string;
  icono: string;
  tone: PlanningUnitCard['tone'];
  semanaInicio: number;
  semanaFin: number;
  clases: ScheduleItem[];
  evaluaciones: ScheduleItem[];
};

@Component({
  selector: 'app-plannings-home-page',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './plannings-home-page.component.html',
  styleUrl: './plannings-home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningsHomePageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly courseApiService = inject(CourseApiService);
  private readonly subjectApiService = inject(SubjectApiService);
  private readonly planningApiService = inject(PlanningApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly currentSchoolYear = new Date().getFullYear();
  private readonly schoolYearOptions = [2025, 2026, 2027, 2028];

  readonly user = this.authStateService.user;

  readonly tabs = computed<Array<{ id: PlanningTab; label: string }>>(() => [
    { id: 'units', label: this.isInitialEducationFlow() ? 'Ámbitos' : 'Unidades' },
    { id: 'schedule', label: 'Cronograma' },
    { id: 'class-by-class', label: 'Clase a clase' },
    { id: 'evaluations', label: 'Evaluaciones' }
  ]);

  readonly semesters: FilterOption<number>[] = [
    { value: 1, label: 'Primer semestre' },
    { value: 2, label: 'Segundo semestre' }
  ];
  readonly scheduleWeeks = Array.from({ length: 24 }, (_, index) => index + 1);
  readonly scheduleMonths = computed<ScheduleMonth[]>(() => {
    return this.selectedSemester() === 2
      ? [
        { label: 'Julio', startWeek: 1, span: 4 },
        { label: 'Agosto', startWeek: 5, span: 4 },
        { label: 'Septiembre', startWeek: 9, span: 4 },
        { label: 'Octubre', startWeek: 13, span: 4 },
        { label: 'Noviembre', startWeek: 17, span: 4 },
        { label: 'Diciembre', startWeek: 21, span: 4 }
      ]
      : [
        { label: 'Marzo', startWeek: 1, span: 4 },
        { label: 'Abril', startWeek: 5, span: 4 },
        { label: 'Mayo', startWeek: 9, span: 4 },
        { label: 'Junio', startWeek: 13, span: 4 }
      ];
  });
  readonly currentScheduleWeek = computed<number | null>(() => {
    const year = this.selectedYear();
    const semester = this.selectedSemester();
    if (year == null || semester == null) {
      return null;
    }

    const now = new Date();
    if (now.getFullYear() !== year) {
      return null;
    }

    const month = now.getMonth() + 1;
    const semesterStartMonth = semester === 2 ? 7 : 3;
    const semesterEndMonth = semester === 2 ? 12 : 6;

    if (month < semesterStartMonth || month > semesterEndMonth) {
      return null;
    }

    const semesterStart = new Date(year, semesterStartMonth - 1, 1);
    const diffDays = Math.floor((now.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return Math.min(Math.max(week, 1), 24);
  });
  readonly scheduleUnits = computed<ScheduleUnit[]>(() => {
    const unitCards = this.unitCards();
    const classRecords = this.classRecords();

    return unitCards.map((unit) => {
      const weekRange = this.resolveUnitScheduleRange(unit);
      const unitClasses = classRecords
        .filter((planningClass) => planningClass.unitId === unit.id)
        .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate));

      const clases = unitClasses.map((planningClass, index) => ({
        id: planningClass.id,
        titulo: `Clase ${index + 1}`,
        semana: this.resolveScheduleWeek(planningClass.plannedDate, weekRange.startWeek),
        tipo: 'clase' as const
      }));

      const evaluaciones = unitClasses
        .filter((planningClass) => planningClass.evaluationType !== 'SIN_EVALUACION')
        .map((planningClass) => ({
          id: planningClass.id,
          titulo: this.resolveEvaluationLabel(planningClass.evaluationType),
          semana: this.resolveScheduleWeek(planningClass.plannedDate, weekRange.endWeek),
          tipo: 'evaluacion' as const
        }));

      return {
        id: unit.id,
        numero: unit.unitNumber ?? 0,
        nombre: this.stripUnitPrefix(unit.title),
        icono: this.resolveScheduleIcon(unit.tone),
        tone: unit.tone,
        semanaInicio: weekRange.startWeek,
        semanaFin: weekRange.endWeek,
        clases,
        evaluaciones
      };
    });
  });

  readonly activeTab = signal<PlanningTab>('units');
  readonly isLoading = signal(true);
  readonly infoDismissed = signal(false);
  readonly dashboard = signal<PlanningSummary | null>(null);
  readonly classRecords = signal<PlanningClass[]>([]);
  readonly assignments = signal<PlanningUnitCatalogAssignment[]>([]);
  readonly availableCourses = signal<Course[]>([]);
  readonly availableSubjects = signal<Subject[]>([]);
  readonly selectedYear = signal<number | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedSubjectId = signal<number | null>(null);
  readonly selectedSemester = signal<number | null>(resolveCurrentAcademicSemester());
  readonly preferredUnitId = signal<number | null>(null);
  readonly openUnitId = signal<number | null>(null);
  readonly openClassMenuId = signal<number | null>(null);
  readonly openClassResourcesId = signal<number | null>(null);
  readonly pendingUploadClassId = signal<number | null>(null);
  readonly updatingDocumentVisibilityIds = signal<number[]>([]);
  readonly selectedDetailUnitId = signal<number | null>(null);
  readonly selectedDetailClassId = signal<number | null>(null);
  readonly selectedClassPreview = signal<PlanningClass | null>(null);
  readonly selectedPreviewUnit = signal<PlanningUnitCard | null>(null);
  readonly isPreviewLoading = signal(false);

  readonly years = computed<FilterOption<number>[]>(() => {
    const values = Array.from(
      new Set([...this.schoolYearOptions, ...this.assignments().map((item) => item.schoolYear)])
    ).sort((a, b) => a - b);
    return values.map((value) => ({ value, label: String(value) }));
  });

  readonly courses = computed<FilterOption<number>[]>(() => {
    const year = this.selectedYear();
    const courseMap = new Map<number, FilterOption<number>>();

    this.assignments()
      .filter((assignment) => year == null || assignment.schoolYear === year)
      .forEach((assignment) => {
        if (courseMap.has(assignment.courseId)) {
          return;
        }

        const course = this.availableCourses().find((item) => item.id === assignment.courseId);
        const label = course?.letter
          ? `${course.name} ${course.letter}`
          : assignment.courseName;

        courseMap.set(assignment.courseId, {
          value: assignment.courseId,
          label
        });
      });

    return Array.from(courseMap.values())
      .sort((left, right) => left.label.localeCompare(right.label, 'es', { numeric: true, sensitivity: 'base' }));
  });

  readonly subjects = computed<FilterOption<number>[]>(() => {
    const courseId = this.selectedCourseId();
    const subjectMap = new Map<number, FilterOption<number>>();

    this.assignments()
      .filter((assignment) => courseId == null || assignment.courseId === courseId)
      .forEach((assignment) => {
        if (subjectMap.has(assignment.subjectId)) {
          return;
        }

        const subject = this.availableSubjects().find((item) => item.id === assignment.subjectId);
        subjectMap.set(assignment.subjectId, {
          value: assignment.subjectId,
          label: subject?.name ?? assignment.subjectName
        });
      });

    return Array.from(subjectMap.values())
      .sort((left, right) => left.label.localeCompare(right.label, 'es', { numeric: true, sensitivity: 'base' }));
  });
  readonly selectedCourseModel = computed(() =>
    this.availableCourses().find((course) => course.id === this.selectedCourseId()) ?? null
  );
  readonly isInitialEducationFlow = computed(() => this.matchesInitialEducationCourse(this.selectedCourseModel()));
  readonly unitSingularLabel = computed(() => this.isInitialEducationFlow() ? 'ámbito' : 'unidad');
  readonly unitPluralLabel = computed(() => this.isInitialEducationFlow() ? 'ámbitos' : 'unidades');
  readonly pageTitleLabel = computed(() => this.isInitialEducationFlow() ? 'Ámbitos' : 'Unidades');
  readonly pageSubtitleLabel = computed(() =>
    this.isInitialEducationFlow() ? 'Gestiona los ámbitos de aprendizaje.' : 'Gestiona las unidades de aprendizaje.'
  );
  readonly createUnitLabel = computed(() => this.isInitialEducationFlow() ? 'Nuevo ámbito' : 'Crear unidad');
  readonly firstCreateUnitLabel = computed(() => this.isInitialEducationFlow() ? 'Crear tu primer ámbito' : 'Crear tu primera unidad');
  readonly summaryTitleLabel = computed(() => this.isInitialEducationFlow() ? 'Resumen de ámbitos' : 'Resumen de unidades');
  readonly emptyStateTitleLabel = computed(() =>
    this.isInitialEducationFlow() ? 'Aún no tienes ámbitos creados' : 'Aún no tienes unidades creadas'
  );
  readonly emptyStateDescriptionLabel = computed(() =>
    this.isInitialEducationFlow()
      ? 'Comienza creando tu primer ámbito para organizar los objetivos de aprendizaje y clases de este semestre.'
      : 'Comienza creando tu primera unidad para organizar los objetivos de aprendizaje y clases de este semestre.'
  );
  readonly loadingUnitsLabel = computed(() => this.isInitialEducationFlow() ? 'Cargando ámbitos...' : 'Cargando unidades...');
  readonly infoBannerLabel = computed(() =>
    this.isInitialEducationFlow()
      ? 'Crea ámbitos, agrega clases y define objetivos de aprendizaje a tu ritmo.'
      : 'Crea unidades, agrega clases y define objetivos de aprendizaje a tu ritmo.'
  );

  readonly hasRequiredFilters = computed(() =>
    this.selectedYear() != null &&
    this.selectedCourseId() != null &&
    this.selectedSubjectId() != null &&
    this.selectedSemester() != null
  );

  readonly hasUnits = computed(() => (this.dashboard()?.units.length ?? 0) > 0);

  readonly averageCoverage = computed(() => this.dashboard()?.summary.semesterProgressPercent ?? 0);
  readonly totalLearningObjectives = computed(() => {
    const objectiveCodes = new Set<string>();

    for (const planningClass of this.classRecords()) {
      for (const objective of planningClass.curriculumObjectives) {
        const normalizedCode = this.normalizeObjectiveCode(objective.codigo);
        if (normalizedCode) {
          objectiveCodes.add(normalizedCode);
        }
      }

      for (const selection of planningClass.objectiveSelections) {
        const normalizedCode = this.normalizeObjectiveCode(selection.objectiveCode);
        if (normalizedCode) {
          objectiveCodes.add(normalizedCode);
        }
      }

      const normalizedMainCode = this.normalizeObjectiveCode(
        planningClass.objectiveCode || this.extractObjectiveCode(planningClass.objectiveTitle || planningClass.objectiveDescription)
      );
      if (normalizedMainCode) {
        objectiveCodes.add(normalizedMainCode);
      }
    }

    return objectiveCodes.size;
  });

  readonly unitCards = computed<PlanningUnitCard[]>(() => {
    const palette: PlanningUnitCard['tone'][] = ['violet', 'emerald', 'amber', 'blue'];
    return this.sortPlanningUnits(this.dashboard()?.units ?? [])
      .map((unit, index) => this.mapUnitCard(unit, palette[index % palette.length]));
  });

  readonly summaryItems = computed<SummaryItem[]>(() => {
    const summary = this.dashboard()?.summary;
    const totalClasses = summary?.totalClasses ?? 0;
    const totalUnits = summary?.totalUnits ?? 0;
    const hours = this.unitCards().reduce((acc, unit) => acc + unit.classes, 0);
    return [
      { label: 'Total de clases', value: String(totalClasses), icon: 'calendar_month', tone: 'violet' },
      { label: 'Objetivos de aprendizaje', value: String(this.totalLearningObjectives()), icon: 'fact_check', tone: 'blue' },
      { label: this.isInitialEducationFlow() ? 'Ámbitos' : 'Unidades', value: String(totalUnits), icon: 'menu_book', tone: 'amber' },
      { label: 'Horas planificadas', value: `${hours} hrs`, icon: 'schedule', tone: 'emerald' },
      { label: 'Cobertura OA promedio', value: `${this.averageCoverage()}%`, icon: 'donut_small', tone: 'gray' }
    ];
  });

  readonly selectedUnitDetail = computed<PlanningUnitCard | null>(() => {
    const units = this.unitCards();
    const selectedId = this.selectedDetailUnitId() ?? this.openUnitId();
    return units.find((unit) => unit.id === selectedId) ?? units[0] ?? null;
  });

  readonly selectedClassDetailRow = computed<PlanningUnitClassRow | null>(() => {
    const unit = this.selectedUnitDetail();
    if (!unit) {
      return null;
    }

    const selectedClassId = this.selectedDetailClassId();
    if (selectedClassId != null) {
      const selectedRow = unit.classRows.find((classRow) => classRow.id === selectedClassId);
      if (selectedRow) {
        return selectedRow;
      }
    }

    return unit.classRows[0] ?? null;
  });

  readonly selectedClassDetail = computed<PlanningClass | null>(() => {
    const selectedRow = this.selectedClassDetailRow();
    if (selectedRow?.id == null) {
      return null;
    }

    return this.classRecords().find((planningClass) => planningClass.id === selectedRow.id) ?? null;
  });

  readonly selectedUnitClassProgress = computed(() => {
    const unit = this.selectedUnitDetail();
    const plannedClasses = unit?.plannedClasses ?? 0;
    if (!unit || plannedClasses <= 0) {
      return 0;
    }

    return Math.min(Math.round((unit.classRows.length / plannedClasses) * 100), 100);
  });

  readonly selectedClassDetailProgress = computed(() => {
    const planningClass = this.selectedClassDetail();
    if (!planningClass) {
      return 0;
    }

    return planningClass.status === 'PUBLICADA' ? 100 : 50;
  });

  readonly currentTabLabel = computed(() => {
    return this.tabs().find((tab) => tab.id === this.activeTab())?.label ?? this.pageTitleLabel();
  });
  readonly previewUnitObjectives = computed<ClassPreviewObjective[]>(() => {
    const planningClass = this.selectedClassPreview();
    if (!planningClass) {
      return [];
    }

    if (planningClass.curriculumObjectives.length) {
      return planningClass.curriculumObjectives.map((objective) => ({
        code: objective.codigo,
        description: objective.descripcion,
        indicators: []
      }));
    }

    return planningClass.objectiveCode
      ? [{
        code: planningClass.objectiveCode,
        description: planningClass.objectiveDescription || planningClass.objectiveTitle || 'OA principal de la clase.',
        indicators: []
      }]
      : [];
  });
  readonly previewClassObjectives = computed<ClassPreviewObjective[]>(() => {
    const planningClass = this.selectedClassPreview();
    if (!planningClass) {
      return [];
    }

    const unitObjectivesByCode = new Map(
      this.previewUnitObjectives().map((objective) => [
        this.normalizeObjectiveCode(objective.code),
        objective
      ] as const)
    );

    if (planningClass.objectiveSelections.length) {
      const seenCodes = new Set<string>();

      return planningClass.objectiveSelections.reduce<ClassPreviewObjective[]>((acc, selection) => {
        const normalizedCode = this.normalizeObjectiveCode(selection.objectiveCode);
        if (!normalizedCode || seenCodes.has(normalizedCode)) {
          return acc;
        }

        seenCodes.add(normalizedCode);
        const matchedObjective = unitObjectivesByCode.get(normalizedCode);

        acc.push({
          code: selection.objectiveCode || matchedObjective?.code || 'OA',
          description: matchedObjective?.description || 'OA seleccionado para esta clase.',
          indicators: selection.indicators ?? []
        });
        return acc;
      }, []);
    }

    return planningClass.objectiveCode
      ? [{
        code: planningClass.objectiveCode,
        description: planningClass.objectiveDescription || planningClass.objectiveTitle || 'OA principal de la clase.',
        indicators: []
      }]
      : [];
  });
  readonly previewObjectives = computed<ClassPreviewObjective[]>(() => this.previewClassObjectives());
  readonly previewPhases = computed<ClassPreviewPhase[]>(() => {
    const planningClass = this.selectedClassPreview();
    if (!planningClass) {
      return [];
    }

    const totalMinutes = this.estimateClassDurationMinutes(planningClass.durationCode, planningClass.durationLabel);
    const phaseMinutes = this.resolvePhaseMinutes(totalMinutes);

    return [
      {
        title: 'Inicio',
        tone: 'violet',
        description: planningClass.startActivity || 'Sin actividad de inicio registrada.',
        duration: `${phaseMinutes.start} min`
      },
      {
        title: 'Desarrollo',
        tone: 'emerald',
        description: planningClass.developmentActivity || 'Sin actividad de desarrollo registrada.',
        duration: `${phaseMinutes.development} min`
      },
      {
        title: 'Cierre',
        tone: 'amber',
        description: planningClass.closingActivity || 'Sin actividad de cierre registrada.',
        duration: `${phaseMinutes.closing} min`
      }
    ];
  });
  readonly classByClassBoards = computed(() =>
    [...this.unitCards()]
      .sort((left, right) => this.compareUnitCards(left, right))
      .map((unit) => ({
      unit,
      cards: unit.classRows.map((classRow) => this.mapClassByClassCard(unit, classRow))
    }))
  );
  readonly classByClassRows = computed(() =>
    this.classByClassBoards().flatMap((board) => board.cards)
  );
  readonly classByClassStats = computed(() => {
    const rows = this.classByClassRows();
    const planned = rows.filter((row) => row.statusTone === 'planned').length;
    const progress = rows.filter((row) => row.statusTone === 'progress').length;
    const completed = rows.filter((row) => row.statusTone === 'completed').length;

    return [
      {
        label: 'clases estimadas',
        value: rows.length,
        icon: 'menu_book',
        tone: 'violet'
      },
      {
        label: 'planificadas',
        value: planned,
        icon: 'check_circle',
        tone: 'emerald'
      },
      {
        label: 'pendientes',
        value: progress,
        icon: 'schedule',
        tone: 'amber'
      },
      {
        label: 'realizadas',
        value: completed,
        icon: 'task_alt',
        tone: 'blue'
      }
    ] as const;
  });

  constructor() {
    this.loadCourses();
    this.loadSubjects();
    this.loadCatalogs();
  }

  setTab(tab: PlanningTab): void {
    this.activeTab.set(tab);
  }

  updateYear(value: string): void {
    this.selectedYear.set(value ? Number(value) : null);
    this.syncFiltersAfterYearChange();
    this.loadSummary();
  }

  updateCourse(value: string): void {
    this.selectedCourseId.set(value ? Number(value) : null);
    this.syncSubjectSelection();
    this.loadSummary();
  }

  updateSubject(value: string): void {
    this.selectedSubjectId.set(value ? Number(value) : null);
    this.loadSummary();
  }

  updateSemester(value: string): void {
    this.selectedSemester.set(value ? Number(value) : null);
    this.loadSummary();
  }

  toggleUnit(unitId: number): void {
    this.openUnitId.update((current) => current === unitId ? null : unitId);
    this.openClassMenuId.set(null);
    this.selectedDetailUnitId.set(unitId);
    this.selectedDetailClassId.set(this.unitCards().find((unit) => unit.id === unitId)?.classRows[0]?.id ?? null);
  }

  isUnitOpen(unitId: number): boolean {
    return this.openUnitId() === unitId;
  }

  dismissInfo(): void {
    this.infoDismissed.set(true);
  }

  openCreateUnit(): void {
    if (!this.hasRequiredFilters()) {
      this.snackBar.open(
        'Debes seleccionar año, curso, asignatura y semestre antes de crear una unidad.',
        'Cerrar',
        { duration: 3800 }
      );
      return;
    }

    this.router.navigate([this.resolveUnitEditorRoute()], {
      queryParams: {
        year: this.selectedYear(),
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.selectedSemester()
      }
    });
  }

  openCreateClass(unit?: PlanningUnitCard): void {
    if (!this.hasRequiredFilters()) {
      this.snackBar.open(
        'Debes seleccionar año, curso, asignatura y semestre antes de crear una clase.',
        'Cerrar',
        { duration: 3800 }
      );
      return;
    }

    this.router.navigate(['/dashboard/planificaciones-nuevo/nueva-clase'], {
      queryParams: {
        year: this.selectedYear(),
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.selectedSemester(),
        unitNumber: unit?.unitNumber ?? undefined,
        unitId: unit?.id ?? undefined
      }
    });
  }

  toggleClassMenu(classRow: PlanningUnitClassRow, event: Event): void {
    event.stopPropagation();
    if (classRow.id == null) {
      this.snackBar.open(
        'Esta fila aún no corresponde a una clase guardada. Primero crea la clase desde "Nueva".',
        'Cerrar',
        { duration: 3600 }
      );
      return;
    }

    this.openClassMenuId.update((current) => current === classRow.id ? null : classRow.id);
  }

  toggleClassResources(classRow: PlanningUnitClassRow, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (classRow.id == null || classRow.documentsCount === 0) {
      return;
    }

    this.openClassResourcesId.update((current) => current === classRow.id ? null : classRow.id);
  }

  isClassResourcesOpen(classRow: PlanningUnitClassRow): boolean {
    return classRow.id != null && this.openClassResourcesId() === classRow.id;
  }

  isClassMenuOpen(classRow: PlanningUnitClassRow): boolean {
    return classRow.id != null && this.openClassMenuId() === classRow.id;
  }

  closeClassMenu(): void {
    this.openClassMenuId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.openClassMenuId() !== null) {
      this.closeClassMenu();
    }
  }

  selectClassDetail(classRow: PlanningUnitClassRow, unit: PlanningUnitCard, event?: Event): void {
    event?.stopPropagation();
    if (classRow.id == null) {
      return;
    }

    const isSameClassSelected = this.selectedDetailClassId() === classRow.id;
    const isResourcesOpen = this.openClassResourcesId() === classRow.id;

    this.selectedDetailUnitId.set(unit.id);
    this.selectedDetailClassId.set(classRow.id);

    if (classRow.documentsCount > 0) {
      this.openClassResourcesId.set(isSameClassSelected && isResourcesOpen ? null : classRow.id);
    } else {
      this.openClassResourcesId.set(null);
    }

    this.closeClassMenu();
  }

  isClassDetailSelected(classRow: PlanningUnitClassRow): boolean {
    return classRow.id != null && this.selectedDetailClassId() === classRow.id;
  }

  editClass(classRow: PlanningUnitClassRow, unit: PlanningUnitCard): void {
    this.closeClassMenu();
    if (classRow.id == null) {
      this.snackBar.open('La clase debe estar guardada antes de editarse.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    this.router.navigate(['/dashboard/planificaciones-nuevo/nueva-clase'], {
      queryParams: {
        year: this.selectedYear(),
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.selectedSemester(),
        unitNumber: unit.unitNumber ?? undefined,
        unitId: unit.id,
        classId: classRow.id
      }
    });
  }

  viewClass(classRow: PlanningUnitClassRow, unit: PlanningUnitCard): void {
    this.closeClassMenu();
    if (classRow.id == null) {
      this.snackBar.open('La clase debe estar guardada antes de poder visualizarse.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    const cached = this.classRecords().find((planningClass) => planningClass.id === classRow.id) ?? null;
    this.selectedPreviewUnit.set(unit);
    this.selectedClassPreview.set(cached);
    this.isPreviewLoading.set(true);

    this.planningApiService.getClassById(classRow.id).subscribe({
      next: (planningClass) => {
        this.selectedClassPreview.set(planningClass);
        this.isPreviewLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isPreviewLoading.set(false);
        if (!cached) {
          this.selectedPreviewUnit.set(null);
          this.selectedClassPreview.set(null);
        }
        this.showError(error, 'No fue posible cargar el resumen de la clase');
      }
    });
  }

  closeClassPreview(): void {
    this.selectedPreviewUnit.set(null);
    this.selectedClassPreview.set(null);
    this.isPreviewLoading.set(false);
  }

  editPreviewClass(): void {
    const previewClass = this.selectedClassPreview();
    const previewUnit = this.selectedPreviewUnit();

    if (!previewClass || !previewUnit) {
      return;
    }

    this.closeClassPreview();
    this.editClass({
      id: previewClass.id,
      unitId: previewClass.unitId,
      number: previewClass.id,
      title: previewClass.title,
      tone: previewUnit.tone,
      accentColor: previewUnit.accentColor,
      accentSurface: previewUnit.accentSurface,
      isEvaluation: previewClass.evaluationType !== 'SIN_EVALUACION',
      objectiveCode: previewClass.objectiveCode,
      objective: previewClass.objectiveDescription || previewClass.objectiveTitle || previewClass.title,
      objectiveSummary: this.buildObjectiveSummary(previewClass.objectiveCode, previewClass.objectiveTitle || previewClass.objectiveDescription),
      statusLabel: previewClass.status === 'PUBLICADA' ? 'Publicada' : 'Planificada',
      statusTone: previewClass.status === 'PUBLICADA' ? 'completed' : 'planned',
      documentsCount: previewClass.documents.length,
      documents: previewClass.documents
    }, previewUnit);
  }

  deleteClass(classRow: PlanningUnitClassRow): void {
    this.closeClassMenu();
    if (classRow.id == null) {
      this.snackBar.open('Solo se pueden eliminar clases que ya fueron guardadas.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    this.dialog.open(AdministrationConfirmDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      data: {
        title: 'Eliminar clase',
        message: `Se eliminara la clase ${classRow.number}. Esta accion no se puede deshacer.`,
        confirmLabel: 'Eliminar'
      }
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.planningApiService.deleteClass(classRow.id!).subscribe({
        next: () => {
          this.snackBar.open('Clase eliminada correctamente.', 'Cerrar', { duration: 3200 });
          this.loadSummary();
        },
        error: (error: HttpErrorResponse) => {
          this.showError(error, 'No fue posible eliminar la clase');
        }
      });
    });
  }

  createClassFromUnit(unit: PlanningUnitCard, event?: Event): void {
    event?.stopPropagation();
    this.closeClassMenu();
    this.openCreateClass(unit);
  }

  attachResourcesToClass(classRow: PlanningUnitClassRow, input: HTMLInputElement): void {
    this.closeClassMenu();
    if (classRow.id == null) {
      this.snackBar.open('Primero guarda la clase antes de adjuntar recursos.', 'Cerrar', {
        duration: 3400
      });
      return;
    }

    this.pendingUploadClassId.set(classRow.id);
    input.value = '';
    input.click();
  }

  onClassResourceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const classId = this.pendingUploadClassId();

    if (!file || classId == null) {
      return;
    }

    this.planningApiService.uploadClassDocument(classId, file, false).subscribe({
      next: () => {
        this.pendingUploadClassId.set(null);
        input.value = '';
        this.snackBar.open('Recurso adjuntado correctamente.', 'Cerrar', { duration: 3200 });
        this.openClassResourcesId.set(classId);
        this.loadSummary();
      },
      error: (error: HttpErrorResponse) => {
        this.pendingUploadClassId.set(null);
        input.value = '';
        this.showError(error, 'No fue posible adjuntar el recurso');
      }
    });
  }

  deleteClassDocument(classRow: PlanningUnitClassRow, document: PlanningClassDocument, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeClassMenu();

    if (classRow.id == null) {
      this.snackBar.open('Solo se pueden eliminar recursos de clases guardadas.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    this.dialog.open(AdministrationConfirmDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      data: {
        title: 'Eliminar documento',
        message: `Se eliminara ${document.originalName}. Esta accion no se puede deshacer.`,
        confirmLabel: 'Eliminar'
      }
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.planningApiService.removeClassDocument(classRow.id!, document.id).subscribe({
        next: () => {
          this.snackBar.open('Documento eliminado correctamente.', 'Cerrar', { duration: 3200 });
          this.openClassResourcesId.set(classRow.id!);
          this.loadSummary();
        },
        error: (error: HttpErrorResponse) => {
          this.showError(error, 'No fue posible eliminar el documento');
        }
      });
    });
  }

  toggleClassDocumentStudentVisibility(document: PlanningClassDocument, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.updatingDocumentVisibilityIds().includes(document.id)) {
      return;
    }

    this.updatingDocumentVisibilityIds.update((current) => [...current, document.id]);

    this.planningApiService.updatePlanningDocumentVisibility(document.id, !document.visibleToStudents).subscribe({
      next: () => {
        this.snackBar.open(
          !document.visibleToStudents
            ? 'Documento visible para estudiante.'
            : 'Documento marcado solo para docente.',
          'Cerrar',
          { duration: 2600 }
        );
        this.updatingDocumentVisibilityIds.update((current) => current.filter((id) => id !== document.id));
        this.loadSummary();
      },
      error: (error: HttpErrorResponse) => {
        this.updatingDocumentVisibilityIds.update((current) => current.filter((id) => id !== document.id));
        this.showError(error, 'No fue posible actualizar la visibilidad del documento');
      }
    });
  }

  isUpdatingClassDocumentVisibility(documentId: number): boolean {
    return this.updatingDocumentVisibilityIds().includes(documentId);
  }

  deleteUnit(unit: PlanningUnitCard, event?: Event): void {
    event?.stopPropagation();
    this.dialog.open(AdministrationConfirmDialogComponent, {
      width: '460px',
      maxWidth: '92vw',
      data: {
        title: `Eliminar ${this.unitSingularLabel()}`,
        message: `Se eliminara ${unit.title}. Esta accion no se puede deshacer.`,
        confirmLabel: 'Eliminar'
      }
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.planningApiService.deleteUnit(unit.id).subscribe({
        next: () => {
          this.snackBar.open(
            `${this.unitSingularLabel() === 'ámbito' ? 'Ámbito' : 'Unidad'} eliminado correctamente.`,
            'Cerrar',
            { duration: 3200 }
          );
          this.loadSummary();
        },
        error: (error: HttpErrorResponse) => {
          this.showError(error, `No fue posible eliminar el ${this.unitSingularLabel()}`);
        }
      });
    });
  }

  editUnit(unit: PlanningUnitCard, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate([this.resolveUnitEditorRoute()], {
      queryParams: {
        year: this.selectedYear(),
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.selectedSemester(),
        unitId: unit.id
      }
    });
  }

  trackByLabel(_: number, item: SummaryItem): string {
    return item.label;
  }

  previewStatusLabel(status: PlanningClass['status'] | undefined): string {
    return status === 'PUBLICADA' ? 'Lista para guardar' : 'Borrador';
  }

  previewStatusTone(status: PlanningClass['status'] | undefined): string {
    return status === 'PUBLICADA' ? 'success' : 'warning';
  }

  previewEvaluationLabel(value: PlanningClass['evaluationType'] | undefined): string {
    switch (value) {
      case 'PROCESO':
        return 'Proceso';
      case 'SUMATIVA':
        return 'Sumativa';
      case 'DIAGNOSTICA':
        return 'Diagnostica';
      case 'SIN_EVALUACION':
        return 'Clase';
      default:
        return 'Formativa';
    }
  }

  previewInstrumentLabel(planningClass: PlanningClass | null): string {
    if (!planningClass) {
      return 'No definido';
    }

    return planningClass.evaluationType === 'SUMATIVA' ? 'Prueba o pauta' : 'Rubrica';
  }

  previewDateLabel(value: string | undefined): string {
    if (!value) {
      return 'Sin fecha definida';
    }

    const dateOnly = value.split('T')[0] ?? value;
    const [year, month, day] = dateOnly.split('-').map(Number);
    if (!year || !month || !day) {
      return dateOnly;
    }

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  previewDurationLabel(planningClass: PlanningClass | null): string {
    if (!planningClass) {
      return 'Sin duracion definida';
    }

    return `${this.estimateClassDurationMinutes(planningClass.durationCode, planningClass.durationLabel)} minutos`;
  }

  previewResourcesText(planningClass: PlanningClass | null): string {
    if (!planningClass) {
      return 'Sin recursos registrados.';
    }

    if (planningClass.documents.length) {
      return planningClass.documents.map((document) => document.originalName).join(', ');
    }

    return 'Sin recursos adjuntos todavia.';
  }

  classDocumentMeta(document: PlanningClassDocument): string {
    return this.formatBytes(document.sizeBytes);
  }

  formatDocumentSize(sizeBytes: number): string {
    return this.formatBytes(sizeBytes);
  }

  classDocumentIcon(document: PlanningClassDocument): string {
    switch (document.fileType) {
      case 'PDF':
        return 'picture_as_pdf';
      case 'WORD':
        return 'description';
      case 'PPT':
        return 'slideshow';
      default:
        return 'insert_drive_file';
    }
  }

  downloadClassDocument(document: PlanningClassDocument, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.planningApiService.downloadPlanningDocument(document.id).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.snackBar.open('No fue posible abrir el recurso adjunto.', 'Cerrar', { duration: 3200 });
          return;
        }

        const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = document.originalName || document.storedName || 'recurso';
        anchor.style.display = 'none';
        window.document.body.appendChild(anchor);
        anchor.click();
        window.setTimeout(() => {
          window.document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        }, 0);
      },
      error: (error: HttpErrorResponse) => {
        this.showError(error, 'No fue posible descargar el recurso');
      }
    });
  }

  scheduleGridColumn(startWeek: number, span = 1): string {
    return `${startWeek} / span ${span}`;
  }

  scheduleUnitBarColumn(unit: ScheduleUnit): string {
    return `${unit.semanaInicio} / ${unit.semanaFin + 1}`;
  }

  scheduleIcon(icon: string): string {
    return icon;
  }

  scheduleTrackByUnit(_: number, unit: ScheduleUnit): number {
    return unit.id;
  }

  scheduleCurrentWeekValue(): number | null {
    return this.currentScheduleWeek();
  }

  previewEvidenceText(planningClass: PlanningClass | null): string {
    if (!planningClass) {
      return 'Sin evidencia registrada.';
    }

    return planningClass.objectiveDescription
      || planningClass.objectiveTitle
      || 'Sin evidencia de aprendizaje registrada.';
  }

  classByClassTrackBy(_: number, item: ClassByClassCard): string {
    return item.id;
  }

  openClassByClassPreview(card: ClassByClassCard, unit: PlanningUnitCard): void {
    if (card.classId == null) {
      this.snackBar.open('La clase debe estar guardada antes de poder visualizarse.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    const planningClass = this.classRecords().find((record) => record.id === card.classId) ?? null;

    this.viewClass({
      id: card.classId,
      unitId: card.unitId,
      number: card.classNumber,
      title: card.title,
      tone: unit.tone,
      accentColor: unit.accentColor,
      accentSurface: unit.accentSurface,
      isEvaluation: planningClass?.evaluationType !== 'SIN_EVALUACION',
      objectiveCode: card.objectiveCode,
      objective: card.objective,
      objectiveSummary: this.buildObjectiveSummary(card.objectiveCode, card.objective),
      statusLabel: card.statusLabel,
      statusTone: card.statusTone,
      documentsCount: planningClass?.documents.length ?? 0,
      documents: planningClass?.documents ?? []
    }, unit);
  }

  getUnitCardById(unitId: number): PlanningUnitCard | null {
    return this.unitCards().find((unit) => unit.id === unitId) ?? null;
  }

  private loadCatalogs(): void {
    this.isLoading.set(true);
    this.planningApiService.getUnitCatalogs().subscribe({
      next: (catalogs) => {
        this.assignments.set(catalogs.teachingAssignments);
        this.initializeSelections();
        this.loadSummary();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los filtros de planificaciónes');
      }
    });
  }

  private loadCourses(): void {
    this.courseApiService.findAll().subscribe({
      next: (courses) => {
        this.availableCourses.set(courses.filter((course) => course.active));
        this.syncCourseSelection();
        this.syncSubjectSelection();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos disponibles')
    });
  }

  private loadSubjects(): void {
    this.subjectApiService.findAll().subscribe({
      next: (subjects) => {
        this.availableSubjects.set(subjects.filter((subject) => subject.active));
        this.syncSubjectSelection();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar las asignaturas disponibles')
    });
  }

  private initializeSelections(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const preferredYear = this.parseQueryNumber(queryParams.get('year'));
    const preferredCourseId = this.parseQueryNumber(queryParams.get('courseId'));
    const preferredSubjectId = this.parseQueryNumber(queryParams.get('subjectId'));
    const preferredSemester = this.parseQueryNumber(queryParams.get('semester'));
    const preferredUnitId = this.parseQueryNumber(queryParams.get('unitId'));
    const years = this.years();
    this.selectedYear.set(
      years.find((item) => item.value === preferredYear)?.value
      ?? years.find((item) => item.value === this.currentSchoolYear)?.value
      ?? years[0]?.value
      ?? null
    );
    this.syncCourseSelection(preferredCourseId);
    this.syncSubjectSelection(preferredSubjectId);
    this.selectedSemester.set(
      preferredSemester === 1 || preferredSemester === 2
        ? preferredSemester
        : resolveCurrentAcademicSemester()
    );
    this.preferredUnitId.set(preferredUnitId);
  }

  private syncFiltersAfterYearChange(): void {
    this.syncCourseSelection();
    this.syncSubjectSelection();
  }

  private syncCourseSelection(preferredCourseId?: number | null): void {
    const currentCourseId = preferredCourseId ?? this.selectedCourseId();
    const options = this.courses();
    const exists = options.some((item) => item.value === currentCourseId);
    this.selectedCourseId.set(
      exists
        ? currentCourseId
        : this.resolveSuggestedCourseId(options)
    );
  }

  private syncSubjectSelection(preferredSubjectId?: number | null): void {
    const currentSubjectId = preferredSubjectId ?? this.selectedSubjectId();
    const options = this.subjects();
    const exists = options.some((item) => item.value === currentSubjectId);
    this.selectedSubjectId.set(exists ? currentSubjectId : (options[0]?.value ?? null));
  }

  private resolveSuggestedCourseId(options: FilterOption<number>[]): number | null {
    if (!options.length) {
      return null;
    }

    const year = this.selectedYear();
    const subjectCountsByCourse = new Map<number, { label: string; subjectIds: Set<number> }>();

    for (const assignment of this.assignments()) {
      if (year != null && assignment.schoolYear !== year) {
        continue;
      }

      const current = subjectCountsByCourse.get(assignment.courseId) ?? {
        label: assignment.courseName,
        subjectIds: new Set<number>()
      };
      current.subjectIds.add(assignment.subjectId);
      subjectCountsByCourse.set(assignment.courseId, current);
    }

    const rankedCourseId = Array.from(subjectCountsByCourse.entries())
      .sort((left, right) => {
        const subjectDiff = right[1].subjectIds.size - left[1].subjectIds.size;
        if (subjectDiff !== 0) {
          return subjectDiff;
        }

        return left[1].label.localeCompare(right[1].label, 'es', { sensitivity: 'base' });
      })[0]?.[0] ?? null;

    return options.find((item) => item.value === rankedCourseId)?.value ?? options[0]?.value ?? null;
  }

  private parseQueryNumber(value: string | null): number | null {
    if (value == null || value.trim() === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / (1024 ** exponent);
    const digits = size >= 10 || exponent === 0 ? 0 : 1;
    return `${size.toFixed(digits)} ${units[exponent]}`;
  }

  private resolveUnitEditorRoute(): string {
    return this.isInitialEducationFlow()
      ? '/dashboard/planificaciones-nuevo/nuevo-ámbito'
      : '/dashboard/planificaciones-nuevo/nueva-unidad';
  }

  private loadSummary(): void {
    if (!this.hasRequiredFilters()) {
      this.dashboard.set(null);
      this.classRecords.set([]);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    const currentSelectedUnitId = this.selectedDetailUnitId() ?? this.openUnitId() ?? this.preferredUnitId();
    const currentSelectedClassId = this.selectedDetailClassId();
    const currentOpenResourcesClassId = this.openClassResourcesId();
    const filters = {
      year: this.selectedYear() ?? undefined,
      courseId: this.selectedCourseId() ?? undefined,
      subjectId: this.selectedSubjectId() ?? undefined,
      semester: this.selectedSemester() ?? undefined
    };

    forkJoin({
      summary: this.planningApiService.getPlanningSummary(filters),
      classes: this.planningApiService.getClasses(filters)
    }).subscribe({
      next: ({ summary, classes }) => {
        this.dashboard.set(summary);
        this.classRecords.set(classes);
        const sortedUnits = this.sortPlanningUnits(summary.units);
        const preferredUnitId = this.preferredUnitId();
        const selectedUnitId = sortedUnits.some((unit) => unit.id === currentSelectedUnitId)
          ? currentSelectedUnitId
          : sortedUnits.some((unit) => unit.id === preferredUnitId)
            ? preferredUnitId
            : (sortedUnits[0]?.id ?? null);
        const selectedClassId = classes.some((planningClass) => planningClass.id === currentSelectedClassId)
          ? currentSelectedClassId
          : classes.find((planningClass) => planningClass.unitId === selectedUnitId)?.id ?? null;
        const openResourcesClassId = classes.some((planningClass) => planningClass.id === currentOpenResourcesClassId)
          ? currentOpenResourcesClassId
          : null;

        this.openUnitId.set(selectedUnitId);
        this.selectedDetailUnitId.set(selectedUnitId);
        this.selectedDetailClassId.set(selectedClassId);
        this.openClassMenuId.set(null);
        this.openClassResourcesId.set(openResourcesClassId);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.dashboard.set(null);
        this.classRecords.set([]);
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar las unidades planificadas');
      }
    });
  }

  private mapUnitCard(unit: PlanningSummaryUnit, tone: PlanningUnitCard['tone']): PlanningUnitCard {
    const accentColor = this.resolveUnitAccentColor(unit.unitColorHex ?? unit.subjectColorHex, tone);
    const accentSurface = this.hexToRgba(accentColor, 0.08);
    const accentSurfaceStrong = this.hexToRgba(accentColor, 0.16);

    return {
      id: unit.id,
      unitNumber: this.extractFirstNumber(unit.code),
      title: `${unit.code}: ${unit.name}`,
      period: this.resolveDateRangeLabel(unit.startDate, unit.endDate),
      weekRange: unit.weekRange,
      startDate: unit.startDate,
      endDate: unit.endDate,
      description: `Curso ${unit.courseName} · ${unit.subjectName}`,
      classes: unit.totalClasses,
      plannedClasses: this.resolvePlannedClassesTarget(unit),
      resources: unit.totalDocuments,
      coverage: unit.progressPercent,
      tone,
      accentColor,
      accentSurface,
      accentSurfaceStrong,
      statusLabel: this.resolveStatusLabel(unit.status),
      classRows: this.buildClassRows(unit, tone)
    };
  }

  private sortPlanningUnits(units: PlanningSummaryUnit[]): PlanningSummaryUnit[] {
    return [...units].sort((left, right) => {
      const leftNumber = this.extractFirstNumber(left.code) ?? Number.MAX_SAFE_INTEGER;
      const rightNumber = this.extractFirstNumber(right.code) ?? Number.MAX_SAFE_INTEGER;

      if (leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
      }

      return left.id - right.id;
    });
  }

  private resolvePlannedClassesTarget(unit: PlanningSummaryUnit): number {
    if (unit.plannedClasses > 0) {
      return unit.plannedClasses;
    }

    const estimatedByDates = this.estimateWeeklyClassesFromDateRange(unit.startDate, unit.endDate);
    return Math.max(unit.totalClasses, estimatedByDates);
  }

  private estimateWeeklyClassesFromDateRange(startDate: string | null, endDate: string | null): number {
    if (!startDate || !endDate) {
      return 0;
    }

    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0;
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }

  private buildClassRows(unit: PlanningSummaryUnit, tone: PlanningUnitCard['tone']): PlanningUnitClassRow[] {
    const accentColor = this.resolveUnitAccentColor(unit.unitColorHex ?? unit.subjectColorHex, tone);
    const accentSurface = this.hexToRgba(accentColor, 0.08);

    const actualClasses = this.classRecords()
      .filter((planningClass) => planningClass.unitId === unit.id)
      .sort((left, right) => this.comparePlanningClassesByDisplayOrder(left, right));

    if (actualClasses.length) {
      return actualClasses.map((planningClass, index) => ({
        id: planningClass.id,
        unitId: unit.id,
        number: index + 1,
        title: planningClass.title,
        tone,
        accentColor,
        accentSurface,
        isEvaluation: planningClass.evaluationType !== 'SIN_EVALUACION',
        objectiveCode: planningClass.objectiveCode || this.extractObjectiveCode(planningClass.objectiveTitle || planningClass.objectiveDescription),
        objective: planningClass.objectiveDescription || planningClass.objectiveTitle || planningClass.title,
        objectiveSummary: this.buildObjectiveSummary(
          planningClass.objectiveCode || this.extractObjectiveCode(planningClass.objectiveTitle || planningClass.objectiveDescription),
          planningClass.objectiveTitle || planningClass.objectiveDescription || planningClass.title
        ),
        statusLabel: planningClass.status === 'PUBLICADA' ? 'Publicada' : 'Planificada',
        statusTone: planningClass.status === 'PUBLICADA' ? 'completed' : 'planned',
        documentsCount: planningClass.documents.length,
        documents: planningClass.documents
      }));
    }

    return [];
  }

  private resolveUnitAccentColor(
    subjectColorHex: string | null | undefined,
    tone: PlanningUnitCard['tone']
  ): string {
    return this.normalizeHexColor(subjectColorHex) ?? this.resolveToneColor(tone);
  }

  private resolveToneColor(tone: PlanningUnitCard['tone']): string {
    switch (tone) {
      case 'emerald':
        return '#10b981';
      case 'amber':
        return '#f59e0b';
      case 'blue':
        return '#3b82f6';
      case 'violet':
      default:
        return '#6d28d9';
    }
  }

  private normalizeHexColor(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized || !/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalized = this.normalizeHexColor(hex);
    if (!normalized) {
      return `rgba(109, 40, 217, ${alpha})`;
    }

    const red = Number.parseInt(normalized.slice(1, 3), 16);
    const green = Number.parseInt(normalized.slice(3, 5), 16);
    const blue = Number.parseInt(normalized.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private resolvePeriodLabel(weekRange: string): string {
    return weekRange && weekRange !== '-' ? `Semanas ${weekRange}` : 'Sin rango definido';
  }

  private resolveDateRangeLabel(startDate: string | null, endDate: string | null): string {
    if (startDate && endDate) {
      return `${this.formatShortDate(startDate)} - ${this.formatShortDate(endDate)}`;
    }

    if (startDate || endDate) {
      return this.formatShortDate(startDate ?? endDate ?? '');
    }

    return 'Sin fechas definidas';
  }

  private formatShortDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return value;
    }

    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${String(day).padStart(2, '0')} ${months[month - 1] ?? ''}`;
  }

  private resolveStatusLabel(status: PlanningSummaryUnit['status']): string {
    switch (status) {
      case 'ACTIVA':
        return 'En progreso';
      case 'COMPLETADA':
        return 'Completada';
      default:
        return 'Pendiente';
    }
  }

  private extractFirstNumber(value: string): number | null {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  private extractObjectiveCode(value: string): string {
    const match = value.match(/\bOA\s*\d+[A-Z]?\b/i);
    return match ? match[0].replace(/\s+/g, '').toUpperCase() : 'OA';
  }

  private normalizeObjectiveCode(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, '').trim().toUpperCase();
  }

  private matchesInitialEducationCourse(course: Course | null): boolean {
    if (!course) {
      return false;
    }

    const labels = [course.name, course.level, course.code];
    return labels.some((value) => {
      const normalized = this.normalizeMatchText(value);
      return normalized.includes('PREKINDER')
        || normalized.includes('KINDER')
        || normalized.includes('NT1')
        || normalized.includes('NT2');
    });
  }

  private normalizeMatchText(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private buildObjectiveSummary(code: string, value: string): string {
    const cleanCode = (code || this.extractObjectiveCode(value)).replace(/\s+/g, '').toUpperCase();
    const text = (value || '')
      .replace(new RegExp(`^${cleanCode}\\s*[:·-]?\\s*`, 'i'), '')
      .replace(/\bOA\s*\d+[A-Z]?\b\s*[:·-]?\s*/i, '')
      .trim();
    const words = text.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    return `${cleanCode} · ${words || 'Objetivo de aprendizaje'}...`;
  }

  private estimateClassDurationMinutes(code: string, label: string): number {
    const normalizedLabel = label.toLowerCase();
    const normalizedCode = code.toLowerCase();
    const explicitMinutes = label.match(/(\d{2,3})\s*min/i)?.[1];

    if (explicitMinutes) {
      return Number(explicitMinutes);
    }

    if (normalizedCode.includes('dos') || normalizedCode.includes('2') || normalizedLabel.includes('2 bloque')) {
      return 90;
    }

    if (normalizedCode.includes('una_semana') || normalizedLabel.includes('semana')) {
      return 180;
    }

    return 45;
  }

  private resolvePhaseMinutes(totalMinutes: number): { start: number; development: number; closing: number } {
    if (totalMinutes >= 90) {
      return { start: 15, development: totalMinutes - 30, closing: 15 };
    }

    if (totalMinutes >= 60) {
      return { start: 10, development: totalMinutes - 20, closing: 10 };
    }

    return { start: 8, development: Math.max(totalMinutes - 16, 20), closing: 8 };
  }

  private parseWeekRange(period: string): { startWeek: number; endWeek: number } {
    const matches = period.match(/\d+/g)?.map(Number) ?? [];
    if (matches.length >= 2) {
      return {
        startWeek: this.clampScheduleWeek(matches[0]),
        endWeek: this.clampScheduleWeek(matches[1])
      };
    }

    if (matches.length === 1) {
      const startWeek = this.clampScheduleWeek(matches[0]);
      return { startWeek, endWeek: Math.min(startWeek + 3, 24) };
    }

    return { startWeek: 1, endWeek: 4 };
  }

  private resolveUnitScheduleRange(unit: PlanningUnitCard): { startWeek: number; endWeek: number } {
    if (unit.startDate && unit.endDate) {
      const startWeek = this.resolveScheduleWeek(unit.startDate, 1);
      const endWeek = this.resolveScheduleWeek(unit.endDate, startWeek);
      return {
        startWeek,
        endWeek: Math.max(startWeek, endWeek)
      };
    }

    return this.parseWeekRange(unit.weekRange);
  }

  private resolveScheduleWeek(plannedDate: string, fallbackWeek: number): number {
    if (!plannedDate) {
      return this.clampScheduleWeek(fallbackWeek);
    }

    const [year, month, day] = plannedDate.split('-').map(Number);
    if (!year || !month || !day) {
      return this.clampScheduleWeek(fallbackWeek);
    }

    const semesterStartMonth = this.selectedSemester() === 2 ? 7 : 3;
    const semesterStart = new Date(year, semesterStartMonth - 1, 1);
    const classDate = new Date(year, month - 1, day);
    if (Number.isNaN(classDate.getTime())) {
      return this.clampScheduleWeek(fallbackWeek);
    }

    const diffDays = Math.floor((classDate.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return this.clampScheduleWeek(week || fallbackWeek);
  }

  private resolveEvaluationLabel(type: PlanningClass['evaluationType']): string {
    return 'Evaluación';
  }

  private resolveScheduleIcon(tone: PlanningUnitCard['tone']): string {
    switch (tone) {
      case 'emerald':
        return 'palette';
      case 'amber':
        return 'visibility';
      case 'blue':
        return 'school';
      default:
        return 'menu_book';
    }
  }

  private stripUnitPrefix(title: string): string {
    return title.replace(/^Unidad\s*\d+\s*:\s*/i, '').trim();
  }

  private clampScheduleWeek(week: number): number {
    return Math.min(Math.max(week, 1), 24);
  }

  private mapClassByClassCard(unit: PlanningUnitCard, classRow: PlanningUnitClassRow): ClassByClassCard {
    const planningClass = classRow.id != null
      ? this.classRecords().find((record) => record.id === classRow.id) ?? null
      : null;

    return {
      id: `${unit.id}-${classRow.number}-${classRow.id ?? 'draft'}`,
      classId: classRow.id,
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      unitTitle: unit.title,
      unitTone: unit.tone,
      classNumber: classRow.number,
      title: planningClass?.title || classRow.title,
      objective: classRow.objective,
      objectiveDisplay: classRow.objectiveSummary || this.buildObjectiveSummary(classRow.objectiveCode, classRow.objective),
      objectiveCode: planningClass?.objectiveCode || `OA${classRow.number}`,
      statusLabel: classRow.statusLabel,
      statusTone: classRow.statusTone,
      durationLabel: planningClass ? this.previewDurationLabel(planningClass) : '45 minutos',
      dateLabel: planningClass ? this.previewDateLabel(planningClass.plannedDate) : 'Fecha por definir',
      resourcesLabel: classRow.documentsCount > 0 ? `${classRow.documentsCount} recurso(s)` : 'Sin recursos',
      unitLabel: unit.unitNumber ? `Unidad ${unit.unitNumber}` : unit.title
    };
  }

  private compareUnitCards(left: PlanningUnitCard, right: PlanningUnitCard): number {
    const leftNumber = left.unitNumber ?? Number.MAX_SAFE_INTEGER;
    const rightNumber = right.unitNumber ?? Number.MAX_SAFE_INTEGER;

    if (leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return left.title.localeCompare(right.title, 'es', { sensitivity: 'base' });
  }

  private comparePlanningClassesByDisplayOrder(left: PlanningClass, right: PlanningClass): number {
    const byDate = this.compareIsoDates(left.plannedDate, right.plannedDate);
    if (byDate !== 0) {
      return byDate;
    }

    return left.id - right.id;
  }

  private compareIsoDates(left: string | null | undefined, right: string | null | undefined): number {
    if (left && right) {
      return left.localeCompare(right);
    }

    if (left) {
      return -1;
    }

    if (right) {
      return 1;
    }

    return 0;
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
