import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { resolveCurrentAcademicSemester } from '../../../core/utils/academic-semester';
import {
  AddOaOtherUnitModalComponent,
  OtherUnitObjectiveOption,
  OtherUnitOption
} from '../components/add-oa-other-unit-modal.component';
import {
  InitialEducationOaModalComponent,
  InitialEducationObjectiveOption,
  InitialEducationSelectedObjective
} from '../components/initial-education-oa-modal.component';
import {
  PlanningSummaryUnit,
  PlanningUnitCatalogAssignment,
  PlanningUnitPayload
} from '../../../core/models/planning.models';
import { Course } from '../../../core/models/course.models';
import { Subject } from '../../../core/models/subject.models';
import {
  StudyProgramDetail,
  StudyProgramObjectiveDetail,
  StudyProgramSummary,
  StudyProgramUnit
} from '../../../core/models/study-program.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import { InitialEducationCurriculumApiService } from '../../../core/services/initial-education-curriculum-api.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { ScheduleApiService } from '../../../core/services/schedule-api.service';
import { StudyProgramApiService } from '../../../core/services/study-program-api.service';
import { SubjectApiService } from '../../../core/services/subject-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import { InitialEducationCurriculumDetail } from '../../../core/models/initial-education-curriculum.models';

type SelectOption = {
  value: string;
  label: string;
};

type PrekinderSubjectMapping = {
  key: string;
  visibleLabel: string;
  ambit: string;
  nucleus: string;
  programSubjectName: string;
  subjectAliases: string[];
};

type PrekinderSubjectOption = PrekinderSubjectMapping & {
  subjectId: string;
  subjectName: string;
};

type ColorOption = {
  value: string;
  label: string;
};

type StepItem = {
  number: number;
  label: string;
  actualStep: number;
};

type PreviewMetric = {
  label: string;
  value: number;
  icon: string;
  tone: 'violet' | 'green' | 'amber' | 'blue';
};

type DayOption = {
  value: string;
  label: string;
};

type ObjetivoAprendizaje = {
  id: string;
  codigo: string;
  descripcion: string;
  eje?: string;
  evaluationIndicators?: string[];
  sourceUnitNumber?: number;
};

type UnidadPrograma = {
  id: number | string;
  numero: number;
  nombre: string;
  semestre: string;
  periodo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  horas?: number;
  descripcion?: string;
  oa: ObjetivoAprendizaje[];
  totalOa: number;
  clasesPlanificadas: number;
  cobertura: number;
  color?: string;
};

@Component({
  selector: 'app-plannings-unit-create-page',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent,
    AddOaOtherUnitModalComponent,
    InitialEducationOaModalComponent
  ],
  templateUrl: './plannings-unit-create-page.component.html',
  styleUrl: './plannings-unit-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningsUnitCreatePageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly courseApiService = inject(CourseApiService);
  private readonly subjectApiService = inject(SubjectApiService);
  private readonly planningApiService = inject(PlanningApiService);
  private readonly studyProgramApiService = inject(StudyProgramApiService);
  private readonly initialEducationCurriculumApiService = inject(InitialEducationCurriculumApiService);
  private readonly scheduleApiService = inject(ScheduleApiService);
  private readonly snackBar = inject(MatSnackBar);
  private programLookupRequestId = 0;
  private initialEducationLookupRequestId = 0;

  readonly user = this.authStateService.user;
  private readonly prekinderMappings: readonly PrekinderSubjectMapping[] = [
    {
      key: 'lecto-escritura',
      visibleLabel: 'Lecto escritura',
      ambit: 'Comunicacion Integral',
      nucleus: 'Lenguaje Verbal',
      programSubjectName: 'Lenguaje Verbal',
      subjectAliases: ['Lecto escritura', 'Lectoescritura', 'Lenguaje verbal', 'Lenguaje']
    },
    {
      key: 'lectura-compartida',
      visibleLabel: 'Lectura compartida',
      ambit: 'Comunicacion Integral',
      nucleus: 'Lenguaje Verbal',
      programSubjectName: 'Lenguaje Verbal',
      subjectAliases: ['Lectura compartida', 'Lecto escritura', 'Lectoescritura', 'Lenguaje verbal', 'Lenguaje']
    },
    {
      key: 'artes',
      visibleLabel: 'Artes',
      ambit: 'Comunicacion Integral',
      nucleus: 'Lenguajes Artisticos',
      programSubjectName: 'Lenguajes Artisticos',
      subjectAliases: ['Artes']
    },
    {
      key: 'musica',
      visibleLabel: 'Musica',
      ambit: 'Comunicacion Integral',
      nucleus: 'Lenguajes Artisticos',
      programSubjectName: 'Lenguajes Artisticos',
      subjectAliases: ['Musica']
    },
    {
      key: 'matematica',
      visibleLabel: 'Matemática',
      ambit: 'Interaccion y Comprension del Entorno',
      nucleus: 'Pensamiento Matematico',
      programSubjectName: 'Pensamiento Matematico',
      subjectAliases: ['Matemática']
    },
    {
      key: 'ciencias-naturales',
      visibleLabel: 'Ciencias naturales',
      ambit: 'Interaccion y Comprension del Entorno',
      nucleus: 'Exploracion del Entorno Natural',
      programSubjectName: 'Exploracion del Entorno Natural',
      subjectAliases: ['Ciencias naturales']
    },
    {
      key: 'entorno-sociocultural',
      visibleLabel: 'Social',
      ambit: 'Interaccion y Comprension del Entorno',
      nucleus: 'Comprension del Entorno Sociocultural',
      programSubjectName: 'Comprension del Entorno Sociocultural',
      subjectAliases: ['Social', 'Comprension del Entorno Sociocultural']
    },
    {
      key: 'educacion-fisica',
      visibleLabel: 'Educacion Fisica',
      ambit: 'Desarrollo Personal y Social',
      nucleus: 'Corporalidad y Movimiento',
      programSubjectName: 'Corporalidad y Movimiento',
      subjectAliases: ['Educacion Fisica']
    },
    {
      key: 'social',
      visibleLabel: 'Social',
      ambit: 'Desarrollo Personal y Social',
      nucleus: 'Identidad y Autonomia',
      programSubjectName: 'Identidad y Autonomia',
      subjectAliases: ['Social', 'Formacion personal y social', 'Identidad y Autonomia']
    },
    {
      key: 'social-convivencia',
      visibleLabel: 'Social',
      ambit: 'Desarrollo Personal y Social',
      nucleus: 'Convivencia y Ciudadania',
      programSubjectName: 'Convivencia y Ciudadania',
      subjectAliases: ['Social', 'Formacion personal y social', 'Convivencia y ciudadania']
    },
    {
      key: 'ingles',
      visibleLabel: 'Ingles',
      ambit: 'Taller Complementario',
      nucleus: 'Institucional',
      programSubjectName: 'Ingles',
      subjectAliases: ['Ingles']
    }
  ];

  readonly steps = computed<StepItem[]>(() => this.isInitialEducationFlow()
    ? [
        { number: 1, label: 'Curso y asignatura', actualStep: 1 },
        { number: 2, label: 'Fechas y clases', actualStep: 3 },
        { number: 3, label: 'Objetivos OA', actualStep: 4 },
        { number: 4, label: 'Revision', actualStep: 5 }
      ]
    : [
        { number: 1, label: 'Curso y asignatura', actualStep: 1 },
        { number: 2, label: 'Unidad del programa', actualStep: 2 },
        { number: 3, label: 'Fechas y clases', actualStep: 3 },
        { number: 4, label: 'Objetivos OA', actualStep: 4 },
        { number: 5, label: 'Revision', actualStep: 5 }
      ]);

  readonly colors: ColorOption[] = [
    { value: '#6d28d9', label: 'Violeta' },
    { value: '#10b981', label: 'Esmeralda' },
    { value: '#f59e0b', label: 'Ambar' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#8b5cf6', label: 'Purpura' },
    { value: '#f97316', label: 'Naranja' },
    { value: '#ef4444', label: 'Rojo' },
    { value: '#ec4899', label: 'Rosa' },
    { value: '#94a3b8', label: 'Gris' }
  ];

  readonly semesters: SelectOption[] = [
    { value: '1', label: 'Primer semestre' },
    { value: '2', label: 'Segundo semestre' }
  ];

  readonly classDays: DayOption[] = [
    { value: 'Lunes', label: 'Lunes' },
    { value: 'Martes', label: 'Martes' },
    { value: 'Miercoles', label: 'Miercoles' },
    { value: 'Jueves', label: 'Jueves' },
    { value: 'Viernes', label: 'Viernes' }
  ];

  readonly activeStep = signal(1);
  readonly isLoading = signal(true);
  readonly isLoadingSchedule = signal(false);
  readonly isContinuing = signal(false);
  readonly isUnitModalOpen = signal(false);
  readonly isOtherUnitOaModalOpen = signal(false);
  readonly isInitialEducationOaModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly assignments = signal<PlanningUnitCatalogAssignment[]>([]);
  readonly availableCourses = signal<Course[]>([]);
  readonly availableSubjects = signal<Subject[]>([]);
  readonly availablePrograms = signal<StudyProgramSummary[]>([]);
  readonly selectedProgram = signal<StudyProgramDetail | null>(null);
  readonly initialEducationObjectives = signal<InitialEducationObjectiveOption[]>([]);
  readonly unidadesFiltradas = signal<UnidadPrograma[]>([]);
  readonly selectedUnidad = signal<UnidadPrograma | null>(null);
  readonly appliedUnidad = signal<UnidadPrograma | null>(null);
  readonly addedOtherUnitOas = signal<OtherUnitObjectiveOption[]>([]);
  readonly initialEducationSelectedObjectives = signal<ObjetivoAprendizaje[]>([]);
  readonly editingUnitId = signal<number | null>(null);
  readonly hydratedUnitId = signal<number | null>(null);
  readonly year = signal('');
  readonly course = signal('');
  readonly subject = signal('');
  readonly prekinderAmbit = signal('');
  readonly prekinderNucleus = signal('');
  readonly prekinderVisibleSubjectKey = signal('');
  readonly semester = signal(String(resolveCurrentAcademicSemester()));
  readonly selectedColor = signal('#6d28d9');
  readonly colorManuallySelected = signal(false);
  readonly existingUnitsCount = signal(0);
  readonly latestExistingUnitEndDate = signal<string | null>(null);
  readonly validationMessage = signal('');
  readonly step3ValidationMessage = signal('');
  readonly reviewValidationMessage = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly dateRangeManuallyEdited = signal(false);
  readonly selectedClassDays = signal<string[]>(['Lunes', 'Miercoles', 'Viernes']);
  readonly manualClassAdjustment = signal<number | null>(null);

  readonly years = computed<SelectOption[]>(() => {
    const values = Array.from(new Set(this.assignments().map((item) => item.schoolYear))).sort((a, b) => b - a);
    return values.map((value) => ({ value: String(value), label: String(value) }));
  });

  readonly courses = computed<SelectOption[]>(() => {
    const selectedYear = this.year();
    const courseMap = new Map<string, SelectOption>();

    this.assignments()
      .filter((assignment) => !selectedYear || String(assignment.schoolYear) === selectedYear)
      .forEach((assignment) => {
        const value = String(assignment.courseId);
        if (courseMap.has(value)) {
          return;
        }

        const course = this.availableCourses().find((item) => item.id === assignment.courseId);
        const label = course?.letter
          ? `${course.name} ${course.letter}`
          : assignment.courseName;

        courseMap.set(value, {
          value,
          label
        });
      });

    return Array.from(courseMap.values())
      .sort((left, right) => left.label.localeCompare(right.label, 'es', { numeric: true, sensitivity: 'base' }));
  });

  readonly subjects = computed<SelectOption[]>(() => {
    const selectedCourse = this.course();
    const subjectMap = new Map<string, SelectOption>();

    this.assignments()
      .filter((assignment) => !selectedCourse || String(assignment.courseId) === selectedCourse)
      .forEach((assignment) => {
        const value = String(assignment.subjectId);
        if (subjectMap.has(value)) {
          return;
        }

        const subject = this.availableSubjects().find((item) => item.id === assignment.subjectId);
        subjectMap.set(value, {
          value,
          label: subject?.name ?? assignment.subjectName
        });
      });

    return Array.from(subjectMap.values())
      .sort((left, right) => left.label.localeCompare(right.label, 'es', { numeric: true, sensitivity: 'base' }));
  });

  readonly yearLabel = computed(() => this.findLabel(this.years(), this.year()));
  readonly courseLabel = computed(() => this.findLabel(this.courses(), this.course()));
  readonly selectedCourseModel = computed(() =>
    this.availableCourses().find((course) => String(course.id) === this.course()) ?? null
  );
  readonly isPrekinderFlow = computed(() => this.matchesPrekinderCourse(this.selectedCourseModel()));
  readonly initialEducationProgramGrade = computed(() => this.resolveInitialEducationProgramGrade(this.selectedCourseModel()));
  readonly prekinderSubjectOptions = computed<PrekinderSubjectOption[]>(() => {
    if (!this.isInitialEducationFlow()) {
      return [];
    }

    const selectedCourseId = Number(this.course());
    const availableSubjects = this.availableSubjects()
      .filter((subject) =>
        this.assignments().some((assignment) =>
          assignment.subjectId === subject.id
          && (!selectedCourseId || assignment.courseId === selectedCourseId)
        )
      );

    return this.prekinderMappings.flatMap((mapping) => {
      const matchedSubject = availableSubjects.find((subject) =>
        mapping.subjectAliases.some((alias) => this.normalizeMatchText(alias) === this.normalizeMatchText(subject.name))
      );

      if (!matchedSubject) {
        return [];
      }

      return [{
        ...mapping,
        subjectId: String(matchedSubject.id),
        subjectName: matchedSubject.name
      }];
    });
  });
  readonly prekinderAmbitOptions = computed<SelectOption[]>(() => {
    const values = Array.from(new Set(this.prekinderSubjectOptions().map((item) => item.ambit)));
    return values.map((value) => ({ value, label: value }));
  });
  readonly prekinderNucleusOptions = computed<SelectOption[]>(() => {
    const selectedAmbit = this.prekinderAmbit();
    const values = Array.from(
      new Set(
        this.prekinderSubjectOptions()
          .filter((item) => !selectedAmbit || item.ambit === selectedAmbit)
          .map((item) => item.nucleus)
      )
    );
    return values.map((value) => ({ value, label: value }));
  });
  readonly filteredPrekinderSubjectOptions = computed<SelectOption[]>(() =>
    Array.from(new Set(this.prekinderSubjectOptions().map((item) => item.visibleLabel)))
      .map((label) => ({ value: label, label }))
  );
  readonly selectedPrekinderSubject = computed(() =>
    this.resolvePreferredPrekinderSubjectByVisibleLabel(this.prekinderVisibleSubjectKey())
  );
  readonly isInitialEducationFlow = computed(() => this.matchesInitialEducationCourse(this.selectedCourseModel()));
  readonly unitEntitySingular = computed(() => this.isInitialEducationFlow() ? 'ámbito' : 'unidad');
  readonly unitEntitySingularCapitalized = computed(() => this.isInitialEducationFlow() ? 'ámbito' : 'Unidad');
  readonly unitEntityPluralCapitalized = computed(() => this.isInitialEducationFlow() ? 'ámbitos' : 'Unidades');
  readonly pageTitle = computed(() => this.isInitialEducationFlow() ? 'Nuevo ámbito' : 'Nueva unidad');
  readonly pageSubtitle = computed(() => this.isInitialEducationFlow()
    ? 'Nuevo ámbito para la planificación de educación inicial.'
    : 'Nueva unidad para las unidades de aprendizaje.'
  );
  readonly stepAriaLabel = computed(() => `Pasos de ${this.pageTitle().toLowerCase()}`);
  readonly selectionCardDescription = computed(() => this.isInitialEducationFlow()
    ? 'Estos datos determinaran los ámbitos disponibles desde la ruta curricular oficial.'
    : 'Estos datos determinaran las unidades disponibles desde el programa oficial Mineduc.'
  );
  readonly colorSectionLabel = computed(() => `Color del ${this.unitEntitySingular()}`);
  readonly manualCreateLabel = computed(() => `Crear ${this.unitEntitySingular()} manual`);
  readonly reviewTitle = computed(() => `Revision final del ${this.unitEntitySingular()}`);
  readonly selectedEntityLabel = computed(() => `${this.unitEntitySingularCapitalized()} seleccionado`);
  readonly saveActionLabel = computed(() => `Guardar ${this.unitEntitySingular()}`);
  readonly step3Title = computed(() => `Configura las fechas y clases del ${this.unitEntitySingular()}`);
  readonly step3Description = computed(() =>
    `Define el periodo en que se trabajara este ${this.unitEntitySingular()} y el sistema calculara las clases disponibles según tu horario semanal.`
  );
  readonly subjectLabel = computed(() => this.selectedPrekinderSubject()?.visibleLabel ?? this.findLabel(this.subjects(), this.subject()));
  readonly resolvedProgramSubjectName = computed(() =>
    this.selectedPrekinderSubject()?.programSubjectName ?? this.findLabel(this.subjects(), this.subject())
  );
  readonly resolvedProgramGrade = computed(() => this.initialEducationProgramGrade() ?? this.extractGradeFromCourse(this.courseLabel()));
  readonly semesterLabel = computed(() => this.semester() === '2' ? 'Segundo semestre' : 'Primer semestre');
  readonly appliedUnitTitle = computed(() => this.appliedUnidad()?.nombre || `${this.unitEntitySingularCapitalized()} sin seleccionar`);
  readonly appliedUnitNumber = computed(() => this.appliedUnidad()?.numero ?? 0);
  readonly calculatedWeeks = computed(() => this.calculateWeeks(this.startDate(), this.endDate()));
  readonly classesPerWeek = computed(() => this.selectedClassDays().length);
  readonly totalCalculatedClasses = computed(() => this.calculatedWeeks() * this.classesPerWeek());
  readonly finalEstimatedClasses = computed(() => {
    const manual = this.manualClassAdjustment();
    return manual && manual > 0 ? manual : this.totalCalculatedClasses();
  });
  readonly projectedEndDate = computed(() =>
    this.calculateProjectedEndDate(this.startDate(), this.selectedClassDays(), this.finalEstimatedClasses())
  );
  readonly projectedEndDateLabel = computed(() => this.formatFechaCorta(this.projectedEndDate()));
  readonly previewPeriod = computed(() => this.formatPeriodPreview(this.startDate(), this.endDate()));
  readonly selectedObjectives = computed<ObjetivoAprendizaje[]>(() => {
    if (this.isInitialEducationFlow()) {
      return this.initialEducationSelectedObjectives();
    }

    const result = new Map<string, ObjetivoAprendizaje>();

    for (const objective of this.appliedUnidad()?.oa ?? []) {
      result.set(objective.codigo, objective);
    }

    for (const objective of this.addedOtherUnitOas()) {
      if (!result.has(objective.codigo)) {
        result.set(objective.codigo, {
          id: objective.id,
          codigo: objective.codigo,
          descripcion: objective.descripcion,
          eje: objective.eje,
          sourceUnitNumber: objective.unitNumber ?? undefined
        });
      }
    }

    return Array.from(result.values());
  });
  readonly hasInitialEducationCurriculum = computed(() =>
    this.isInitialEducationFlow() &&
    !!this.year() &&
    !!this.course() &&
    !!this.subject() &&
    !!this.semester() &&
    !!this.prekinderAmbit() &&
    !!this.prekinderNucleus() &&
    this.initialEducationObjectiveOptions().length > 0
  );
  readonly programReference = computed(() => {
    if (this.isInitialEducationFlow()) {
      if (this.hasInitialEducationCurriculum()) {
        return `Ruta curricular de educación inicial cargada para ${this.initialEducationProgramGrade() ?? 'educación inicial'} · ${this.subjectLabel()} · ${this.prekinderAmbit()} · ${this.prekinderNucleus()}.`;
      }

      return this.hasSelectionContext()
        ? 'No se encontro una ruta curricular de educación inicial para la selección actual. Puedes continuar con un ámbito manual.'
        : 'Selecciona curso, asignatura visible, ámbito y nucleo para cargar la ruta curricular de educación inicial.';
    }

    const program = this.selectedProgram();
    if (!program) {
      return this.hasSelectionContext()
        ? 'No se encontro un programa oficial disponible para la selección actual. Puedes continuar con una unidad manual.'
        : 'No se encontro un programa oficial disponible para la selección actual.';
    }
    return `Esta planificación se basa en el Programa de Estudio ${program.grade}, ${program.decree}, ${program.edition}.`;
  });
  readonly reviewProgramLabel = computed(() => {
    const program = this.selectedProgram();
    if (!program) {
      return `${this.unitEntitySingularCapitalized()} manual sin programa oficial`;
    }
    return `Programa ${program.decree} · ${program.edition}`;
  });
  readonly reviewSubjectLabel = computed(() => {
    const subject = this.subjectLabel();
    if (!subject) {
      return '';
    }
    if (subject.toLowerCase() === 'lenguaje y comunicacion') {
      return 'Lenguaje';
    }
    return subject.replace(' y Comunicacion', '').replace(' y Comunicación', '');
  });
  readonly reviewPeriodLabel = computed(() => this.formatReviewPeriodLabel(this.startDate(), this.endDate()));
  readonly reviewDaysSummary = computed(() => {
    const days = this.selectedClassDays();
    if (!days.length) {
      return 'Dias por definir';
    }
    return `Dias: ${days.join(' · ')} · ${this.classesPerWeek()} clases/semana`;
  });
  readonly saveStateLabel = computed(() => this.isReadyToSave() ? 'Lista para guardar' : 'Faltan datos para guardar');
  readonly hasSelectionContext = computed(() =>
    !!this.year() && !!this.course() && !!this.subject() && !!this.semester()
  );
  readonly canCreateManualUnit = computed(() => {
    if (!this.hasSelectionContext()) {
      return false;
    }

    if (this.isInitialEducationFlow()) {
      return !this.hasInitialEducationCurriculum();
    }

    return !this.selectedProgram();
  });

  readonly metricCards = computed<PreviewMetric[]>(() => {
    const program = this.selectedProgram();
    const availableUnits = this.unidadesFiltradas();
    const availableObjectives = availableUnits.reduce((total, unit) => total + (unit.totalOa ?? 0), 0);
    return [
      {
        label: `${this.unitEntityPluralCapitalized()} disponibles`,
        value: availableUnits.length,
        icon: 'menu_book',
        tone: 'violet'
      },
      {
        label: 'OA disponibles',
        value: availableObjectives,
        icon: 'task_alt',
        tone: 'green'
      },
      {
        label: 'Horas anuales',
        value: program?.totalHours ?? 0,
        icon: 'schedule',
        tone: 'amber'
      },
      {
        label: 'Actitudes',
        value: program?.globalAttitudes.length ?? 0,
        icon: 'verified',
        tone: 'blue'
      }
    ];
  });

  readonly axes = computed(() => this.selectedProgram()?.axes ?? []);
  readonly usedColorValues = computed(() =>
    new Set(this.colors.slice(0, Math.min(this.existingUnitsCount(), this.colors.length)).map((color) => color.value))
  );
  readonly suggestedColor = computed(() => {
    const index = this.existingUnitsCount() % this.colors.length;
    return this.colors[index]?.value ?? this.colors[0].value;
  });
  readonly otherUnitOptions = computed<OtherUnitOption[]>(() =>
    this.buildOtherUnitOptions(this.selectedProgram())
  );
  readonly initialEducationObjectiveOptions = computed<InitialEducationObjectiveOption[]>(() =>
    this.initialEducationObjectives()
  );
  readonly selectedInitialEducationIndicatorKeys = computed(() =>
    this.initialEducationSelectedObjectives().flatMap((objective) =>
      (objective.evaluationIndicators ?? []).map((indicator) => `${objective.id}::${indicator}`)
    )
  );
  readonly selectedOtherUnitOaIds = computed(() => this.addedOtherUnitOas().map((item) => item.id));

  constructor() {
    this.loadCourses();
    this.loadSubjects();
    this.loadCatalogs();
  }

  selectColor(color: string): void {
    this.colorManuallySelected.set(true);
    this.selectedColor.set(color);
  }

  isColorUsed(color: string): boolean {
    return this.usedColorValues().has(color);
  }

  isSuggestedColor(color: string): boolean {
    return this.suggestedColor() === color;
  }

  cancel(): void {
    this.router.navigate(['/dashboard/planificaciones-nuevo'], {
      queryParams: {
        year: this.year() || undefined,
        courseId: this.course() || undefined,
        subjectId: this.subject() || undefined,
        semester: this.semester() || undefined
      }
    });
  }

  updateYear(value: string): void {
    this.year.set(value);
    this.syncCourseSelection();
    this.syncSubjectSelection();
    this.syncUnitEditorRoute();
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updateCourse(value: string): void {
    this.course.set(value);
    this.syncSubjectSelection();
    this.syncUnitEditorRoute();
    this.initialEducationSelectedObjectives.set([]);
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updateSubject(value: string): void {
    this.subject.set(value);
    this.syncPrekinderSelectorsFromCurrentSubject();
    this.syncUnitEditorRoute();
    this.initialEducationSelectedObjectives.set([]);
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updatePrekinderAmbit(value: string): void {
    this.prekinderAmbit.set(value);
    this.syncPrekinderNucleusSelection();
    this.syncPrekinderVisibleSubjectSelection();
    this.syncUnitEditorRoute();
    this.initialEducationSelectedObjectives.set([]);
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updatePrekinderNucleus(value: string): void {
    this.prekinderNucleus.set(value);
    this.syncPrekinderVisibleSubjectSelection();
    this.syncUnitEditorRoute();
    this.initialEducationSelectedObjectives.set([]);
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updatePrekinderVisibleSubject(value: string): void {
    this.prekinderVisibleSubjectKey.set(value);
    const selected = this.resolvePreferredPrekinderSubjectByVisibleLabel(value);
    this.subject.set(selected?.subjectId ?? '');
    this.prekinderAmbit.set(selected?.ambit ?? '');
    this.prekinderNucleus.set(selected?.nucleus ?? '');
    this.syncUnitEditorRoute();
    this.initialEducationSelectedObjectives.set([]);
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updateSemester(value: string): void {
    this.semester.set(value);
    this.syncUnitEditorRoute();
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  continue(): void {
    if (!this.year() || !this.course() || !this.subject() || !this.semester()) {
      this.validationMessage.set('Debes completar año, curso, asignatura y semestre para continuar.');
      return;
    }

    if (this.isInitialEducationFlow()) {
      this.validationMessage.set('');
      this.step3ValidationMessage.set('');
      this.reviewValidationMessage.set('');
      this.prepareInitialEducationFlow();
      return;
    }

    if (!this.selectedProgram()) {
      this.validationMessage.set('No se encontro un programa oficial asociado a la selección actual.');
      return;
    }

    this.validationMessage.set('');
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');
    this.isContinuing.set(true);

    this.studyProgramApiService.getProgram(this.selectedProgram()!.id).subscribe({
      next: (program) => {
        this.selectedProgram.set(program);
        this.isContinuing.set(false);
        this.cargarUnidadesDelPrograma();
        this.openUnitModal();
      },
      error: (error: HttpErrorResponse) => {
        this.isContinuing.set(false);
        this.showError(error, 'No fue posible cargar el programa antes de continuar');
      }
    });
  }

  createManualUnit(): void {
    if (!this.hasSelectionContext()) {
      this.validationMessage.set(`Debes completar año, curso, asignatura y semestre para crear un ${this.unitEntitySingular()} manual.`);
      return;
    }

    this.validationMessage.set('');
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');

    const manualUnit = this.createManualUnitDraft();
    this.unidadesFiltradas.set([manualUnit]);
    this.selectedUnidad.set(manualUnit);
    this.appliedUnidad.set(manualUnit);
    this.closeUnitModal();
    this.initializeStep3Form();
    this.loadScheduleDaysForCurrentSelection();
    this.activeStep.set(3);
  }

  goToManualClass(): void {
    void this.router.navigate(['/dashboard/planificaciones-nuevo/nueva-clase'], {
      queryParams: {
        year: this.year() || undefined,
        courseId: this.course() || undefined,
        subjectId: this.subject() || undefined,
        semester: this.semester() || undefined
      }
    });
  }

  canNavigateToStep(step: number): boolean {
    if (step === this.activeStep()) {
      return true;
    }

    switch (step) {
      case 1:
        return true;
      case 2:
        if (this.isInitialEducationFlow()) {
          return false;
        }
        return this.hasStep1Data();
      case 3:
        return !!this.appliedUnidad();
      case 4:
        return !!this.appliedUnidad() && this.validateStep3();
      case 5:
        return !!this.appliedUnidad() && this.validateStep3() && this.canContinueWithoutObjectives();
      default:
        return false;
    }
  }

  goToStep(step: number): void {
    if (!this.canNavigateToStep(step)) {
      return;
    }

    this.validationMessage.set('');
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');

    if (step === 1) {
      this.closeUnitModal();
      this.closeOtherUnitOaModal();
      this.closeInitialEducationOaModal();
      this.activeStep.set(1);
      return;
    }

    if (step === 2) {
      if (this.isInitialEducationFlow()) {
        return;
      }

      this.closeOtherUnitOaModal();
      this.openUnitModal();
      return;
    }

    if (step === 3) {
      this.closeUnitModal();
      this.closeOtherUnitOaModal();
      this.closeInitialEducationOaModal();
      this.activeStep.set(3);
      return;
    }

    if (step === 4) {
      this.closeUnitModal();
      this.activeStep.set(4);
      if (this.isInitialEducationFlow()) {
        this.openInitialEducationOaModal();
        return;
      }
      this.openOtherUnitOaModal();
      return;
    }

    if (step === 5) {
      this.closeUnitModal();
      this.closeOtherUnitOaModal();
      this.closeInitialEducationOaModal();
      this.activeStep.set(5);
    }
  }

  openUnitModal(): void {
    this.activeStep.set(2);
    this.isUnitModalOpen.set(true);
  }

  closeUnitModal(): void {
    this.isUnitModalOpen.set(false);
  }

  openOtherUnitOaModal(): void {
    if (!this.appliedUnidad()) {
      this.snackBar.open('Primero debes seleccionar una unidad del programa.', 'Cerrar', {
        duration: 2600
      });
      return;
    }

    if (!this.otherUnitOptions().length) {
      this.snackBar.open('No hay OA disponibles para este programa.', 'Cerrar', {
        duration: 2600
      });
      return;
    }

    this.isOtherUnitOaModalOpen.set(true);
  }

  closeOtherUnitOaModal(): void {
    this.isOtherUnitOaModalOpen.set(false);
  }

  openInitialEducationOaModal(): void {
    this.isInitialEducationOaModalOpen.set(true);
  }

  closeInitialEducationOaModal(): void {
    this.isInitialEducationOaModalOpen.set(false);
  }

  applyOtherUnitOas(objectives: OtherUnitObjectiveOption[]): void {
    this.addedOtherUnitOas.set(objectives);
    this.isOtherUnitOaModalOpen.set(false);
    this.reviewValidationMessage.set('');
    this.activeStep.set(5);
    this.snackBar.open(`${objectives.length} OA agregados desde otras unidades.`, 'Cerrar', {
      duration: 2800
    });
  }

  applyInitialEducationOas(objectives: InitialEducationSelectedObjective[]): void {
    this.initialEducationSelectedObjectives.set(objectives.map((objective) => ({
      id: objective.id,
      codigo: objective.codigo,
      descripcion: objective.descripcion,
      eje: objective.eje,
      evaluationIndicators: objective.evaluationIndicators
    })));
    this.isInitialEducationOaModalOpen.set(false);
    this.reviewValidationMessage.set('');
    this.activeStep.set(5);
    this.snackBar.open(`${objectives.length} OA seleccionados para educación inicial.`, 'Cerrar', {
      duration: 2800
    });
  }

  cargarUnidadesDelPrograma(): void {
    const unidades = this.filtrarUnidadesPorContexto();
    this.unidadesFiltradas.set(unidades);
    this.selectedUnidad.set(unidades[0] ?? null);
  }

  filtrarUnidadesPorContexto(): UnidadPrograma[] {
    const program = this.selectedProgram();
    if (!program) {
      return [];
    }

    const selectedSemester = this.semesterLabel();

    return (program.units ?? [])
      .map((unit) => this.mapProgramUnit(unit))
      .filter((unidad) => unidad.semestre === selectedSemester);
  }

  selectUnidad(unidad: UnidadPrograma): void {
    this.selectedUnidad.set(unidad);
  }

  aplicarUnidad(): void {
    const unidad = this.selectedUnidad();
    if (!unidad) {
      return;
    }

    this.appliedUnidad.set(unidad);
    this.closeUnitModal();
    this.initializeStep3Form();
    this.loadScheduleDaysForCurrentSelection();
    this.goToStep(3);
  }

  updateStartDate(value: string): void {
    this.startDate.set(value);
    this.dateRangeManuallyEdited.set(true);
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');
  }

  updateEndDate(value: string): void {
    this.endDate.set(value);
    this.dateRangeManuallyEdited.set(true);
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');
  }

  updateManualClassAdjustment(value: string | number): void {
    const numeric = Number(value);
    this.manualClassAdjustment.set(Number.isFinite(numeric) && numeric > 0 ? numeric : null);
    this.reviewValidationMessage.set('');
  }

  toggleClassDay(day: string): void {
    const current = this.selectedClassDays();
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');

    if (current.includes(day)) {
      this.selectedClassDays.set(current.filter((item) => item !== day));
      return;
    }

    this.selectedClassDays.set([...current, day]);
  }

  goBackToStep2(): void {
    this.step3ValidationMessage.set('');
    if (this.isInitialEducationFlow()) {
      this.activeStep.set(1);
      return;
    }

    this.activeStep.set(2);
    this.openUnitModal();
  }

  continueToStep4(): void {
    if (!this.validateStep3()) {
      this.step3ValidationMessage.set('Debes configurar fechas validas y al menos un dia de clase.');
      return;
    }

    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');
    if (this.isInitialEducationFlow()) {
      this.activeStep.set(4);
      this.openInitialEducationOaModal();
      return;
    }

    if (!this.selectedProgram()) {
      this.activeStep.set(5);
      return;
    }

    this.activeStep.set(4);
    this.openOtherUnitOaModal();
  }

  goBackToStep4(): void {
    this.reviewValidationMessage.set('');
    if (this.isInitialEducationFlow()) {
      this.activeStep.set(4);
      this.openInitialEducationOaModal();
      return;
    }

    if (!this.selectedProgram()) {
      this.activeStep.set(3);
      return;
    }

    this.activeStep.set(4);
    this.openOtherUnitOaModal();
  }

  guardarUnidad(): void {
    if (!this.isReadyToSave()) {
      this.reviewValidationMessage.set(`Faltan datos para guardar el ${this.unitEntitySingular()}.`);
      return;
    }

    const payload = this.buildPlanningPayload();
    this.isSaving.set(true);
    this.reviewValidationMessage.set('');

    const editingUnitId = this.editingUnitId();
    const request$ = editingUnitId != null
      ? this.planningApiService.updateUnitDetails(editingUnitId, payload)
      : this.planningApiService.createUnit(payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open(
          editingUnitId != null
            ? `El ${this.unitEntitySingular()} fue actualizado correctamente.`
            : `El ${this.unitEntitySingular()} fue guardado correctamente.`,
          'Cerrar',
          { duration: 3200 }
        );
        this.router.navigate(['/dashboard/planificaciones-nuevo'], {
          queryParams: {
            year: this.year(),
            courseId: this.course(),
            subjectId: this.subject(),
            semester: this.semester()
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        const message = typeof error.error?.message === 'string'
          ? error.error.message
          : `No fue posible guardar el ${this.unitEntitySingular()}.`;
        this.reviewValidationMessage.set(message);
        this.snackBar.open(message, 'Cerrar', { duration: 3500 });
      }
    });
  }

  isReadyToSave(): boolean {
    return !!(
      this.year()
      && this.course()
      && this.subject()
      && this.semester()
      && this.appliedUnidad()
      && this.startDate()
      && this.endDate()
      && this.finalEstimatedClasses() > 0
      && this.canContinueWithoutObjectives()
    );
  }

  calcularTotalOa(unidad: UnidadPrograma): number {
    return unidad.oa?.length || 0;
  }

  calcularClasesPlanificadas(unidad: UnidadPrograma): number {
    return unidad.clasesPlanificadas || 0;
  }

  calcularCobertura(unidad: UnidadPrograma): number {
    if (unidad.cobertura > 0) {
      return unidad.cobertura;
    }
    if (!unidad.totalOa) {
      return 0;
    }
    return Math.max(0, Math.min(100, 70 - ((unidad.numero || 1) - 1) * 20));
  }

  getOaChipClass(oa: ObjetivoAprendizaje): string {
    const axis = (oa.eje ?? '').toLowerCase();
    if (axis.includes('escrit')) {
      return 'chip-green';
    }
    if (axis.includes('oral')) {
      return 'chip-amber';
    }
    return 'chip-blue';
  }

  getSemestreClass(unidad: UnidadPrograma): string {
    return unidad.semestre === 'Segundo semestre'
      ? 'semester-badge semester-badge--second'
      : 'semester-badge semester-badge--first';
  }

  isStepCompleted(stepNumber: number): boolean {
    if (stepNumber === 1) {
      return this.activeStep() > 1;
    }
    if (stepNumber === 2) {
      if (this.isInitialEducationFlow()) {
        return this.activeStep() > 1 && !!this.appliedUnidad();
      }
      return this.activeStep() > 2 && !!this.appliedUnidad();
    }
    if (stepNumber === 3) {
      return this.activeStep() > 3 && this.validateStep3();
    }
    if (stepNumber === 4) {
      return this.activeStep() > 4 && this.canContinueWithoutObjectives();
    }
    return false;
  }

  isStepActive(stepNumber: number): boolean {
    return this.activeStep() === stepNumber;
  }

  formatStepDate(value: string): string {
    if (!value) {
      return 'Sin fecha';
    }

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }

  formatFechaCorta(value: string): string {
    if (!value) {
      return '--';
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return value;
    }

    const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${day} ${shortMonths[month - 1] ?? ''}`.trim();
  }

  formatObjectiveLabel(objective: ObjetivoAprendizaje): string {
    const normalizedCode = objective.codigo.replace(/^OA\s*/i, 'OA ');
    return objective.eje ? `${normalizedCode} ${objective.eje}` : normalizedCode;
  }

  private loadCatalogs(): void {
    this.isLoading.set(true);
    this.planningApiService.getUnitCatalogs().subscribe({
      next: (catalogs) => {
        this.assignments.set(catalogs.teachingAssignments);
        this.initializeSelectionsFromRoute();
        this.syncUnitEditorRoute();
        this.loadProgramForSelection();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los cursos y asignaturas');
      }
    });
  }

  private loadCourses(): void {
    this.courseApiService.findAll().subscribe({
      next: (courses) => {
        this.availableCourses.set(courses.filter((course) => course.active));
        this.syncCourseSelection();
        this.syncSubjectSelection();
        this.loadProgramForSelection();
        this.loadExistingUnitsForColorSuggestion();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos disponibles')
    });
  }

  private loadSubjects(): void {
    this.subjectApiService.findAll().subscribe({
      next: (subjects) => {
        this.availableSubjects.set(subjects.filter((subject) => subject.active));
        this.syncSubjectSelection();
        this.syncUnitEditorRoute();
        this.loadProgramForSelection();
        this.loadExistingUnitsForColorSuggestion();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar las asignaturas disponibles')
    });
  }

  private syncUnitEditorRoute(): void {
    const currentPath = this.router.url.split('?')[0] ?? '';
    const targetPath = this.isInitialEducationFlow()
      ? '/dashboard/planificaciones-nuevo/nuevo-ámbito'
      : '/dashboard/planificaciones-nuevo/nueva-unidad';

    if (currentPath === targetPath) {
      return;
    }

    if (
      currentPath !== '/dashboard/planificaciones-nuevo/nueva-unidad' &&
      currentPath !== '/dashboard/planificaciones-nuevo/nuevo-ámbito'
    ) {
      return;
    }

    const nextUrl = this.router.serializeUrl(this.router.createUrlTree([targetPath], {
      queryParams: this.buildCurrentEditorQueryParams()
    }));

    this.location.replaceState(nextUrl);
  }

  private buildCurrentEditorQueryParams(): Record<string, string | number | undefined> {
    return {
      year: this.year() || undefined,
      courseId: this.course() || undefined,
      subjectId: this.subject() || undefined,
      semester: this.semester() || undefined,
      unitId: this.editingUnitId() ?? undefined
    };
  }

  private initializeSelectionsFromRoute(): void {
    const yearParam = this.route.snapshot.queryParamMap.get('year');
    const courseIdParam = this.route.snapshot.queryParamMap.get('courseId');
    const subjectIdParam = this.route.snapshot.queryParamMap.get('subjectId');
    const semesterParam = this.route.snapshot.queryParamMap.get('semester');
    const unitIdParam = this.route.snapshot.queryParamMap.get('unitId');

    const years = this.years();
    this.year.set(years.some((item) => item.value === yearParam) ? yearParam! : (years[0]?.value ?? '2026'));

    this.syncCourseSelection(courseIdParam ?? undefined);
    this.syncSubjectSelection(subjectIdParam ?? undefined);
    this.semester.set(semesterParam === '2' ? '2' : String(resolveCurrentAcademicSemester()));
    this.editingUnitId.set(unitIdParam ? Number(unitIdParam) : null);
    this.loadExistingUnitsForColorSuggestion();
  }

  private syncCourseSelection(preferredValue?: string): void {
    const options = this.courses();
    const current = preferredValue ?? this.course();
    const exists = options.some((item) => item.value === current);
    this.course.set(exists ? current : this.resolveSuggestedCourseValue(options));
  }

  private syncSubjectSelection(preferredValue?: string): void {
    const options = this.subjects();
    const current = preferredValue ?? this.subject();
    const exists = options.some((item) => item.value === current);
    this.subject.set(exists ? current : (options[0]?.value ?? ''));
    this.syncPrekinderSelectorsFromCurrentSubject();
  }

  private resolveSuggestedCourseValue(options: SelectOption[]): string {
    if (!options.length) {
      return '';
    }

    const selectedYear = this.year();
    const subjectCountsByCourse = new Map<string, { label: string; subjectIds: Set<string> }>();

    for (const assignment of this.assignments()) {
      if (selectedYear && String(assignment.schoolYear) !== selectedYear) {
        continue;
      }

      const key = String(assignment.courseId);
      const current = subjectCountsByCourse.get(key) ?? {
        label: assignment.courseName,
        subjectIds: new Set<string>()
      };
      current.subjectIds.add(String(assignment.subjectId));
      subjectCountsByCourse.set(key, current);
    }

    const rankedCourseValue = Array.from(subjectCountsByCourse.entries())
      .sort((left, right) => {
        const subjectDiff = right[1].subjectIds.size - left[1].subjectIds.size;
        if (subjectDiff !== 0) {
          return subjectDiff;
        }

        return left[1].label.localeCompare(right[1].label, 'es', { sensitivity: 'base' });
      })[0]?.[0] ?? '';

    return options.find((item) => item.value === rankedCourseValue)?.value ?? options[0]?.value ?? '';
  }

  private loadProgramForSelection(): void {
    const requestId = ++this.programLookupRequestId;
    const subjectName = this.resolvedProgramSubjectName();
    const grade = this.resolvedProgramGrade();
    this.loadInitialEducationCurriculumForSelection();

    if (!subjectName || !grade) {
      if (requestId === this.programLookupRequestId) {
        this.availablePrograms.set([]);
        this.selectedProgram.set(null);
        this.unidadesFiltradas.set([]);
        this.selectedUnidad.set(null);
        this.isLoading.set(false);
      }
      return;
    }

    this.isLoading.set(true);
    this.studyProgramApiService.findPrograms({ subjectName, grade }).subscribe({
      next: (programs) => {
        if (requestId !== this.programLookupRequestId) {
          return;
        }

        this.availablePrograms.set(programs);
        const selected = programs[0] ?? null;
        if (!selected) {
          this.selectedProgram.set(null);
          this.unidadesFiltradas.set([]);
          this.selectedUnidad.set(null);
          this.isLoading.set(false);
          return;
        }

        this.studyProgramApiService.getProgram(selected.id).subscribe({
          next: (program) => {
            if (requestId !== this.programLookupRequestId) {
              return;
            }

            this.selectedProgram.set(program);
            this.cargarUnidadesDelPrograma();
            this.hydrateEditingUnit();
          },
          error: (error: HttpErrorResponse) => {
            if (requestId !== this.programLookupRequestId) {
              return;
            }

            this.selectedProgram.set(null);
            this.unidadesFiltradas.set([]);
            this.selectedUnidad.set(null);
            this.isLoading.set(false);
            this.showError(error, 'No fue posible cargar el detalle del programa');
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.programLookupRequestId) {
          return;
        }

        this.availablePrograms.set([]);
        this.selectedProgram.set(null);
        this.unidadesFiltradas.set([]);
        this.selectedUnidad.set(null);
        this.isLoading.set(false);
        this.showError(error, 'No fue posible buscar el programa oficial');
      }
    });
  }

  private loadExistingUnitsForColorSuggestion(): void {
    const year = Number(this.year());
    const courseId = Number(this.course());
    const subjectId = Number(this.subject());
    const semester = Number(this.semester());

    if (!year || !courseId || !subjectId || !semester) {
      this.existingUnitsCount.set(0);
      this.latestExistingUnitEndDate.set(null);
      this.applySuggestedColor();
      return;
    }

    this.planningApiService.getPlanningSummary({ year, courseId, subjectId, semester }).subscribe({
      next: (summary) => {
        const editingUnitId = this.editingUnitId();
        const existingUnits = summary.units.filter((unit) => unit.id !== editingUnitId);
        this.existingUnitsCount.set(existingUnits.length);
        this.latestExistingUnitEndDate.set(this.resolveLatestUnitEndDate(existingUnits));
        this.refreshSuggestedDateRange();
        this.applySuggestedColor();
      },
      error: () => {
        this.existingUnitsCount.set(0);
        this.latestExistingUnitEndDate.set(null);
        this.refreshSuggestedDateRange();
        this.applySuggestedColor();
      }
    });
  }

  private resolveLatestUnitEndDate(units: PlanningSummaryUnit[]): string | null {
    const dates = units
      .map((unit) => unit.endDate)
      .filter((date): date is string => !!date)
      .filter((date) => !Number.isNaN(new Date(`${date}T00:00:00`).getTime()))
      .sort((left, right) => new Date(`${right}T00:00:00`).getTime() - new Date(`${left}T00:00:00`).getTime());

    return dates[0] ?? null;
  }

  private applySuggestedColor(): void {
    if (this.editingUnitId() != null || this.colorManuallySelected()) {
      return;
    }

    this.selectedColor.set(this.suggestedColor());
  }

  private extractGradeFromCourse(courseName: string): string {
    if (!courseName) {
      return '';
    }

    return courseName.replace(/\s+[A-Z]$/i, '').trim();
  }

  private matchesPrekinderCourse(course: Course | null): boolean {
    if (!course) {
      return false;
    }

    const labels = [course.name, course.level, course.code];
    return labels.some((value) => {
      const normalized = this.normalizeMatchText(value);
      return normalized.includes('PREKINDER') || normalized.includes('NT1');
    });
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

  private resolveInitialEducationProgramGrade(course: Course | null): 'NT1' | 'NT2' | null {
    if (!course) {
      return null;
    }

    const labels = [course.name, course.level, course.code];
    for (const value of labels) {
      const normalized = this.normalizeMatchText(value);
      if (normalized.includes('PREKINDER') || normalized.includes('NT1')) {
        return 'NT1';
      }
      if (normalized.includes('KINDER') || normalized.includes('NT2')) {
        return 'NT2';
      }
    }

    return null;
  }

  private normalizeMatchText(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private syncPrekinderSelectorsFromCurrentSubject(): void {
    if (!this.isInitialEducationFlow()) {
      this.prekinderAmbit.set('');
      this.prekinderNucleus.set('');
      this.prekinderVisibleSubjectKey.set('');
      this.initialEducationObjectives.set([]);
      return;
    }

    const currentSubjectId = this.subject();
    const currentVisibleLabel = this.prekinderVisibleSubjectKey();
    const selectedByLabel = this.resolvePreferredPrekinderSubjectByVisibleLabel(currentVisibleLabel);

    if (selectedByLabel && selectedByLabel.subjectId === currentSubjectId) {
      this.prekinderVisibleSubjectKey.set(selectedByLabel.visibleLabel);
      this.prekinderAmbit.set(selectedByLabel.ambit);
      this.prekinderNucleus.set(selectedByLabel.nucleus);
      return;
    }

    const selected = this.prekinderSubjectOptions().find((item) => item.subjectId === currentSubjectId) ?? null;
    this.prekinderVisibleSubjectKey.set(selected?.visibleLabel ?? '');
    this.prekinderAmbit.set(selected?.ambit ?? '');
    this.prekinderNucleus.set(selected?.nucleus ?? '');
  }

  private syncPrekinderNucleusSelection(): void {
    const options = this.prekinderNucleusOptions();
    const current = this.prekinderNucleus();
    const exists = options.some((item) => item.value === current);
    this.prekinderNucleus.set(exists ? current : (options[0]?.value ?? ''));
  }

  private syncPrekinderVisibleSubjectSelection(): void {
    const options = this.filteredPrekinderSubjectOptions();
    const current = this.prekinderVisibleSubjectKey();
    const exists = options.some((item) => item.value === current);
    const nextKey = exists ? current : (options[0]?.value ?? '');
    this.prekinderVisibleSubjectKey.set(nextKey);

    const selected = this.resolvePreferredPrekinderSubjectByVisibleLabel(nextKey);
    this.subject.set(selected?.subjectId ?? '');
  }

  private resolvePreferredPrekinderSubjectByVisibleLabel(visibleLabel: string): PrekinderSubjectOption | null {
    if (!visibleLabel) {
      return null;
    }

    const normalizedVisibleLabel = this.normalizeMatchText(visibleLabel);
    const matches = this.prekinderSubjectOptions()
      .filter((item) => this.normalizeMatchText(item.visibleLabel) === normalizedVisibleLabel);

    if (!matches.length) {
      return null;
    }

    const currentSubjectId = this.subject();
    return matches.find((item) => item.subjectId === currentSubjectId) ?? matches[0] ?? null;
  }

  private findLabel(options: SelectOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? '';
  }

  private initializeStep3Form(): void {
    const { startDate, endDate } = this.resolveDefaultUnitDateRange();
    this.startDate.set(startDate);
    this.endDate.set(endDate);
    this.dateRangeManuallyEdited.set(false);
    this.manualClassAdjustment.set(null);
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');
  }

  private refreshSuggestedDateRange(): void {
    if (this.editingUnitId() != null || !this.appliedUnidad() || this.dateRangeManuallyEdited()) {
      return;
    }

    const defaultRange = this.resolveSemesterDefaultDateRange();
    const hasDefaultDates = this.startDate() === defaultRange.startDate && this.endDate() === defaultRange.endDate;
    const hasEmptyDates = !this.startDate() && !this.endDate();
    if (!hasDefaultDates && !hasEmptyDates) {
      return;
    }

    const suggestedRange = this.resolveDefaultUnitDateRange();
    this.startDate.set(suggestedRange.startDate);
    this.endDate.set(suggestedRange.endDate);
  }

  private hydrateEditingUnit(): void {
    const unitId = this.editingUnitId();
    if (unitId == null) {
      this.isLoading.set(false);
      return;
    }

    if (this.hydratedUnitId() === unitId) {
      this.isLoading.set(false);
      return;
    }

    this.planningApiService.getUnitById(unitId).subscribe({
      next: (unit) => {
        const mappedNumber = this.mapUnitCodeToNumber(unit.unitNumber);
        const matchedUnit = this.unidadesFiltradas().find((item) => item.numero === mappedNumber)
          ?? this.unidadesFiltradas().find((item) => this.normalizeObjectiveCode(item.nombre) === this.normalizeObjectiveCode(unit.name))
          ?? null;

        if (matchedUnit) {
          this.selectedUnidad.set(matchedUnit);
          this.appliedUnidad.set(matchedUnit);
        }

        this.startDate.set(unit.startDate);
        this.endDate.set(unit.endDate);
        this.selectedColor.set(unit.colorHex || this.suggestedColor());
        this.colorManuallySelected.set(true);
        this.manualClassAdjustment.set(unit.plannedClasses > 0 ? unit.plannedClasses : null);
        this.reviewValidationMessage.set('');
        this.step3ValidationMessage.set('');
        this.activeStep.set(5);
        this.hydratedUnitId.set(unitId);
        this.loadScheduleDaysForCurrentSelection();
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la unidad para editar');
      }
    });
  }

  private loadScheduleDaysForCurrentSelection(): void {
    const courseId = Number(this.course());
    const subjectId = Number(this.subject());

    if (!courseId || !subjectId) {
      this.selectedClassDays.set(['Lunes', 'Miercoles', 'Viernes']);
      return;
    }

    this.isLoadingSchedule.set(true);
    this.scheduleApiService.getCatalog(courseId).subscribe({
      next: (catalog) => {
        const schoolYear = Number(this.year());
        const semester = Number(this.semester());
        const matchingPeriod = catalog.periods.find(
          (period) => period.schoolYear === schoolYear && period.semester === semester
        );

        if (!matchingPeriod) {
          this.selectedClassDays.set(['Lunes', 'Miercoles', 'Viernes']);
          this.isLoadingSchedule.set(false);
          return;
        }

        this.scheduleApiService.getByCourse(courseId, matchingPeriod.id).subscribe({
          next: (entries) => {
            const scheduleDays = Array.from(
              new Set(
                entries
                  .filter((entry) => this.matchesSelectedScheduleSubject(entry, subjectId) && entry.blockType === 'CLASE')
                  .map((entry) => this.normalizeScheduleDay(entry.dayOfWeek))
                  .filter((day): day is string => !!day)
              )
            ).sort((a, b) => this.dayOrder(a) - this.dayOrder(b));

            this.selectedClassDays.set(scheduleDays.length ? scheduleDays : ['Lunes', 'Miercoles', 'Viernes']);
            this.isLoadingSchedule.set(false);
          },
          error: () => {
            this.selectedClassDays.set(['Lunes', 'Miercoles', 'Viernes']);
            this.isLoadingSchedule.set(false);
          }
        });
      },
      error: () => {
        this.selectedClassDays.set(['Lunes', 'Miercoles', 'Viernes']);
        this.isLoadingSchedule.set(false);
      }
    });
  }

  private matchesSelectedScheduleSubject(entry: { subjectId: number; subjectName: string }, subjectId: number): boolean {
    if (entry.subjectId === subjectId) {
      return true;
    }

    const selectedSubject = this.availableSubjects().find((item) => item.id === subjectId);
    const normalizedCandidates = new Set(
      [
        selectedSubject?.name,
        this.subjectLabel(),
        this.resolvedProgramSubjectName()
      ]
        .map((value) => this.normalizeMatchText(value))
        .filter((value) => !!value)
    );

    return normalizedCandidates.has(this.normalizeMatchText(entry.subjectName));
  }

  private mapProgramUnit(unit: StudyProgramUnit): UnidadPrograma {
    const oa = (unit.objectives ?? []).map((objective, index) => this.mapObjective(objective, index));
    const numero = unit.number ?? 0;

    return {
      id: `${numero}-${unit.name}`,
      numero,
      nombre: unit.name,
      semestre: this.resolveSemesterLabel(unit),
      periodo: this.resolvePeriod(unit),
      horas: unit.estimatedHours ?? undefined,
      descripcion: this.resolveDescription(unit),
      oa,
      totalOa: oa.length,
      clasesPlanificadas: 0,
      cobertura: 0,
      color: this.resolveUnitColor(numero)
    };
  }

  private mapObjective(objective: StudyProgramObjectiveDetail, index: number): ObjetivoAprendizaje {
    return {
      id: `${objective.code}-${index}`,
      codigo: objective.code,
      descripcion: objective.description,
      eje: objective.axis,
      evaluationIndicators: objective.evaluationIndicators
    };
  }

  private mapOtherUnitOption(unit: StudyProgramUnit): OtherUnitOption {
    const unitNumber = unit.number ?? 0;
    return {
      key: `unit-${unitNumber}`,
      number: unitNumber,
      name: `Unidad ${unitNumber}`,
      type: 'unit',
      objectives: (unit.objectives ?? []).map((objective, index) => ({
        id: `${unitNumber}-${objective.code}-${index}`,
        codigo: objective.code,
        descripcion: objective.description,
        eje: objective.axis,
        unitNumber,
        unitName: unit.name
      }))
    };
  }

  private buildOtherUnitOptions(program: StudyProgramDetail | null): OtherUnitOption[] {
    if (!program) {
      return [];
    }

    const unitOptions = (program.units ?? []).map((unit) => this.mapOtherUnitOption(unit));
    const transversalObjectives = this.buildTransversalObjectives(program);

    if (!transversalObjectives.length) {
      return unitOptions;
    }

    return [
      ...unitOptions,
      {
        key: 'transversal',
        number: 0,
        name: 'Transversal',
        type: 'transversal',
        helperText: 'Estos objetivos pueden trabajarse de forma transversal durante el año o quedaron fuera de esta planificación. Puedes agregarlos manualmente a una unidad desde "Editar unidad".',
        objectives: transversalObjectives
      }
    ];
  }

  private buildTransversalObjectives(program: StudyProgramDetail): OtherUnitObjectiveOption[] {
    const unitObjectiveCodes = new Set(
      (program.units ?? [])
        .flatMap((unit) => unit.objectives ?? [])
        .map((objective) => this.normalizeObjectiveCode(objective.code))
        .filter((code) => !!code)
    );

    const collected = new Map<string, OtherUnitObjectiveOption>();

    for (const objective of program.permanentObjectives ?? []) {
      const code = this.normalizeObjectiveCode(objective.code);
      if (!code || collected.has(code)) {
        continue;
      }

      collected.set(code, {
        id: `transversal-permanent-${code}`,
        codigo: objective.code,
        descripcion: objective.description,
        eje: objective.axis,
        unitNumber: null,
        unitName: 'Transversal'
      });
    }

    for (const objective of program.objectiveCatalog ?? []) {
      const code = this.normalizeObjectiveCode(objective.code);
      if (!code || unitObjectiveCodes.has(code) || collected.has(code)) {
        continue;
      }

      collected.set(code, {
        id: `transversal-catalog-${code}`,
        codigo: objective.code,
        descripcion: objective.description,
        eje: objective.axis,
        unitNumber: null,
        unitName: 'Transversal'
      });
    }

    return Array.from(collected.values()).sort((left, right) =>
      this.compareObjectiveCodes(left.codigo, right.codigo)
    );
  }

  private normalizeObjectiveCode(code: string): string {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  private compareObjectiveCodes(left: string, right: string): number {
    const leftMatch = left.match(/\d+/);
    const rightMatch = right.match(/\d+/);
    const leftNumber = leftMatch ? Number(leftMatch[0]) : Number.MAX_SAFE_INTEGER;
    const rightNumber = rightMatch ? Number(rightMatch[0]) : Number.MAX_SAFE_INTEGER;

    if (leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return left.localeCompare(right);
  }

  private resolveSemesterLabel(unit: StudyProgramUnit): string {
    if (unit.semester === 2) {
      return 'Segundo semestre';
    }
    if (unit.semester === 1) {
      return 'Primer semestre';
    }
    return (unit.number ?? 0) >= 3 ? 'Segundo semestre' : 'Primer semestre';
  }

  private resolvePeriod(_unit: StudyProgramUnit): string {
    return 'Período por definir';
  }

  private resolveDescription(unit: StudyProgramUnit): string {
    return unit.readingPurpose
      || unit.writingPurpose
      || unit.oralCommunicationPurpose
      || 'Sin descripción disponible.';
  }

  private resolveUnitColor(number: number): string {
    return ({
      1: '#6d28d9',
      2: '#2563eb',
      3: '#f59e0b',
      4: '#3b82f6'
    } as Record<number, string>)[number] ?? '#6d28d9';
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    const message = typeof error.error?.message === 'string' ? error.error.message : fallback;
    this.validationMessage.set(message);
    this.snackBar.open(message, 'Cerrar', { duration: 3500 });
  }

  private hasStep1Data(): boolean {
    return !!this.year() && !!this.course() && !!this.subject() && !!this.semester();
  }

  private buildPlanningPayload(): PlanningUnitPayload {
    const unit = this.appliedUnidad();
    if (!unit) {
      throw new Error('No hay unidad seleccionada.');
    }

    return {
      subjectId: Number(this.subject()),
      courseId: Number(this.course()),
      unitNumber: this.mapUnitNumberCode(unit.numero),
      name: unit.nombre,
      colorHex: this.selectedColor(),
      startWeek: null,
      startDate: this.startDate(),
      endDate: this.endDate(),
      estimatedWeeks: Math.max(1, this.calculatedWeeks()),
      plannedClasses: this.finalEstimatedClasses(),
      generalDescription: unit.descripcion || 'Unidad generada desde Programa de Estudio.',
      learningObjectives: this.buildLearningObjectivesText(),
      achievementIndicators: this.buildAchievementIndicatorsText()
    };
  }

  private buildLearningObjectivesText(): string {
    if (!this.selectedObjectives().length) {
      return 'Unidad creada manualmente sin OA asociados desde un programa oficial.';
    }

    return this.selectedObjectives()
      .map((objective) => `${this.formatObjectiveLabel(objective)}: ${objective.descripcion}`)
      .join('\n');
  }

  private buildAchievementIndicatorsText(): string {
    if (!this.selectedObjectives().length) {
      return 'Sin indicadores oficiales asociados. Unidad registrada en modo manual.';
    }

    const indicators = this.selectedObjectives()
      .flatMap((objective) => objective.evaluationIndicators?.length
        ? objective.evaluationIndicators
        : [objective.descripcion]);

    return Array.from(new Set(indicators)).join('\n');
  }

  private canContinueWithoutObjectives(): boolean {
    if (this.isInitialEducationFlow()) {
      return this.selectedObjectives().length > 0;
    }

    return !this.selectedProgram() || this.selectedObjectives().length > 0;
  }

  private createManualUnitDraft(): UnidadPrograma {
    const unitNumber = Math.max(1, this.existingUnitsCount() + 1);

    return {
      id: `manual-unit-${unitNumber}`,
      numero: unitNumber,
      nombre: `Unidad ${unitNumber}`,
      semestre: this.semesterLabel(),
      descripcion: 'Unidad creada manualmente porque la asignatura no cuenta con programa oficial asociado.',
      oa: [],
      totalOa: 0,
      clasesPlanificadas: 0,
      cobertura: 0,
      color: this.selectedColor()
    };
  }

  private prepareInitialEducationFlow(): void {
    const draft = this.createInitialEducationUnitDraft();
    this.unidadesFiltradas.set([draft]);
    this.selectedUnidad.set(draft);
    this.appliedUnidad.set(draft);
    this.closeUnitModal();
    this.closeOtherUnitOaModal();
    this.initializeStep3Form();
    this.loadScheduleDaysForCurrentSelection();
    this.activeStep.set(3);
  }

  private createInitialEducationUnitDraft(): UnidadPrograma {
    const unitNumber = Math.max(1, this.existingUnitsCount() + 1);
    const subjectName = this.subjectLabel() || 'Experiencia';
    const nucleus = this.prekinderNucleus();
    const ambit = this.prekinderAmbit();
    const descriptionParts = [ambit, nucleus].filter((value) => !!value);

    return {
      id: `initial-unit-${unitNumber}-${this.normalizeMatchText(subjectName)}`,
      numero: unitNumber,
      nombre: subjectName,
      semestre: this.semesterLabel(),
      descripcion: descriptionParts.length
        ? `Planificación inicial asociada a ${descriptionParts.join(' · ')}.`
        : 'Planificación inicial creada sin unidad de programa asociada.',
      oa: [],
      totalOa: 0,
      clasesPlanificadas: 0,
      cobertura: 0,
      color: this.selectedColor()
    };
  }
  private loadInitialEducationCurriculumForSelection(): void {
    const requestId = ++this.initialEducationLookupRequestId;
    if (!this.isInitialEducationFlow()) {
      this.initialEducationObjectives.set([]);
      return;
    }

    const grade = this.initialEducationProgramGrade();
    const visibleSubject = this.subjectLabel();
    const ambit = this.prekinderAmbit();
    const nucleus = this.prekinderNucleus();

    if (!grade || !visibleSubject || !ambit || !nucleus) {
      this.initialEducationObjectives.set([]);
      return;
    }

    this.initialEducationCurriculumApiService.getCurriculumDetail({
      grade,
      visibleSubject,
      ambit,
      nucleus
    }).subscribe({
      next: (curriculum) => {
        if (requestId !== this.initialEducationLookupRequestId) {
          return;
        }

        this.initialEducationObjectives.set(this.mapInitialEducationCurriculumObjectives(curriculum));
      },
      error: () => {
        if (requestId !== this.initialEducationLookupRequestId) {
          return;
        }

        this.initialEducationObjectives.set([]);
      }
    });
  }

  private mapInitialEducationCurriculumObjectives(curriculum: InitialEducationCurriculumDetail): InitialEducationObjectiveOption[] {
    const subjectKey = this.normalizeMatchText(curriculum.visibleSubject).replace(/\s+/g, '-').toLowerCase();

    return (curriculum.objectives ?? []).map((objective) => ({
      id: `${curriculum.grade.toLowerCase()}-${subjectKey}-${objective.code.toLowerCase()}`,
      codigo: objective.code,
      titulo: curriculum.nucleus,
      descripcion: objective.description,
      eje: curriculum.visibleSubject,
      indicadores: objective.evaluationIndicators ?? [],
      activities: objective.activities ?? []
    }));
  }

  private mapUnitNumberCode(number: number): string {
    return ({
      1: 'UNIDAD_I',
      2: 'UNIDAD_II',
      3: 'UNIDAD_III',
      4: 'UNIDAD_IV',
      5: 'UNIDAD_V',
      6: 'UNIDAD_VI',
      7: 'UNIDAD_VII',
      8: 'UNIDAD_VIII'
    } as Record<number, string>)[number] ?? 'UNIDAD_I';
  }

  private mapUnitCodeToNumber(code: string): number {
    return ({
      UNIDAD_I: 1,
      UNIDAD_II: 2,
      UNIDAD_III: 3,
      UNIDAD_IV: 4,
      UNIDAD_V: 5,
      UNIDAD_VI: 6,
      UNIDAD_VII: 7,
      UNIDAD_VIII: 8
    } as Record<string, number>)[code] ?? 1;
  }

  private calculateWeeks(startDate: string, endDate: string): number {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0;
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.ceil(diffDays / 7));
  }

  private calculateProjectedEndDate(startDate: string, selectedDays: string[], totalClasses: number): string {
    if (!startDate || !selectedDays.length || totalClasses <= 0) {
      return '';
    }

    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) {
      return '';
    }

    const targetWeekdays = new Set(
      selectedDays
        .map((day) => this.scheduleDayToWeekday(day))
        .filter((day): day is number => day !== null)
    );

    if (!targetWeekdays.size) {
      return '';
    }

    const targetClasses = Math.floor(totalClasses);
    const cursor = new Date(start);
    let countedClasses = 0;
    let guardDays = 0;

    while (guardDays < 730) {
      if (targetWeekdays.has(cursor.getDay())) {
        countedClasses += 1;
        if (countedClasses >= targetClasses) {
          return this.formatIsoDate(cursor);
        }
      }

      cursor.setDate(cursor.getDate() + 1);
      guardDays += 1;
    }

    return '';
  }

  private scheduleDayToWeekday(day: string): number | null {
    return ({
      Lunes: 1,
      Martes: 2,
      Miercoles: 3,
      Jueves: 4,
      Viernes: 5
    } as Record<string, number>)[day] ?? null;
  }

  private formatIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatPeriodPreview(startDate: string, endDate: string): string {
    if (!startDate || !endDate) {
      return 'Sin periodo definido';
    }

    const [startYear, startMonth, startDay] = startDate.split('-');
    const [endYear, endMonth, endDay] = endDate.split('-');
    if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
      return 'Sin periodo definido';
    }

    return `${startDay}/${startMonth} - ${endDay}/${endMonth}/${endYear}`;
  }

  private formatReviewPeriodLabel(startDate: string, endDate: string): string {
    if (!startDate || !endDate) {
      return 'Período por definir';
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Período por definir';
    }

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[start.getMonth()]} - ${months[end.getMonth()]} ${end.getFullYear()}`;
  }

  private resolveDefaultUnitDateRange(): { startDate: string; endDate: string } {
    const previousEndDate = this.latestExistingUnitEndDate();
    const defaultRange = this.resolveSemesterDefaultDateRange();

    if (!previousEndDate || this.editingUnitId() != null) {
      return defaultRange;
    }

    const suggestedStartDate = this.nextBusinessDay(previousEndDate);
    if (!suggestedStartDate) {
      return defaultRange;
    }

    const defaultEnd = new Date(`${defaultRange.endDate}T00:00:00`);
    const suggestedStart = new Date(`${suggestedStartDate}T00:00:00`);
    const endDate = suggestedStart <= defaultEnd
      ? defaultRange.endDate
      : this.addDays(suggestedStartDate, 56);

    return {
      startDate: suggestedStartDate,
      endDate
    };
  }

  private resolveSemesterDefaultDateRange(): { startDate: string; endDate: string } {
    const year = this.year() || '2026';

    return this.semester() === '2'
      ? {
          startDate: this.firstBusinessDayOfMonth(Number(year), 7),
          endDate: `${year}-12-15`
        }
      : {
          startDate: this.firstBusinessDayOfMonth(Number(year), 3),
          endDate: `${year}-07-31`
        };
  }

  private firstBusinessDayOfMonth(year: number, month: number): string {
    const date = new Date(year, month - 1, 1);

    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    const resolvedYear = date.getFullYear();
    const resolvedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const resolvedDay = String(date.getDate()).padStart(2, '0');
    return `${resolvedYear}-${resolvedMonth}-${resolvedDay}`;
  }

  private nextBusinessDay(dateValue: string): string {
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    return this.formatIsoDate(date);
  }

  private addDays(dateValue: string, days: number): string {
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    date.setDate(date.getDate() + days);
    return this.formatIsoDate(date);
  }

  private validateStep3(): boolean {
    const startDate = this.startDate();
    const endDate = this.endDate();

    if (!startDate || !endDate) {
      return false;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return false;
    }

    return this.selectedClassDays().length > 0;
  }

  private normalizeScheduleDay(value: string): string | null {
    const normalized = value.trim().toLowerCase();
    const map: Record<string, string> = {
      lunes: 'Lunes',
      martes: 'Martes',
      miercoles: 'Miercoles',
      miércoles: 'Miercoles',
      jueves: 'Jueves',
      viernes: 'Viernes'
    };

    return map[normalized] ?? null;
  }

  private dayOrder(day: string): number {
    return this.classDays.findIndex((item) => item.value === day);
  }
}

