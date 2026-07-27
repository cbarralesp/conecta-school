import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { resolveCurrentAcademicSemester } from '../../../core/utils/academic-semester';
import {
  InitialEducationActivitySuggestion,
  InitialEducationActivitySuggestionModalComponent
} from '../components/initial-education-activity-suggestion-modal.component';
import {
  InitialEducationOaModalComponent,
  InitialEducationObjectiveOption,
  InitialEducationSelectedObjective
} from '../components/initial-education-oa-modal.component';
import {
  PlanningClassCatalogs,
  PlanningClassObjectiveSelection,
  PlanningClassCatalogUnit,
  PlanningObjectiveOption,
  PlanningClass,
  PlanningClassPayload,
  PlanningClassSuggestionPayload,
  PlanningUnitCatalogAssignment
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

type StepItem = {
  number: number;
  label: string;
  actualStep: number;
};

type PreviewMetric = {
  label: string;
  value: string;
  icon: string;
  tone: 'violet' | 'green' | 'amber' | 'blue';
};

type UnidadClase = {
  id: number;
  numero: number;
  nombre: string;
  clasesEstimadas: number;
  oaDisponibles: number;
  ejes: string[];
};

type ObjetivoClase = {
  id: string;
  sourceObjectiveId: string | null;
  codigo: string;
  descripcion: string;
  eje: string;
  evaluationIndicators: string[];
  skills: string[];
  attitudes: string[];
};

type OaClaseTab = {
  key: string;
  name: string;
  type?: 'unit' | 'transversal';
  helperText?: string;
  objectives: ObjetivoClase[];
};

type ClassMetric = {
  label: string;
  value: string;
  icon: string;
  tone: 'violet' | 'green' | 'amber' | 'blue';
};

@Component({
  selector: 'app-plannings-class-create-page',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent,
    InitialEducationOaModalComponent,
    InitialEducationActivitySuggestionModalComponent
  ],
  templateUrl: './plannings-class-create-page.component.html',
  styleUrl: './plannings-class-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningsClassCreatePageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly courseApiService = inject(CourseApiService);
  private readonly subjectApiService = inject(SubjectApiService);
  private readonly planningApiService = inject(PlanningApiService);
  private readonly studyProgramApiService = inject(StudyProgramApiService);
  private readonly initialEducationCurriculumApiService = inject(InitialEducationCurriculumApiService);
  private readonly snackBar = inject(MatSnackBar);
  private programLookupRequestId = 0;
  private initialEducationLookupRequestId = 0;
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

  readonly user = this.authStateService.user;

  readonly steps = computed<StepItem[]>(() => this.isInitialEducationFlow()
    ? [
        { number: 1, label: 'Curso y asignatura', actualStep: 1 },
        { number: 2, label: 'Objetivos OA', actualStep: 3 },
        { number: 3, label: 'Datos de la clase', actualStep: 4 }
      ]
    : [
        { number: 1, label: 'Curso y asignatura', actualStep: 1 },
        { number: 2, label: this.unitSingularLabelTitle(), actualStep: 2 },
        { number: 3, label: 'Objetivos OA', actualStep: 3 },
        { number: 4, label: 'Datos de la clase', actualStep: 4 }
      ]);

  readonly semesters: SelectOption[] = [
    { value: '1', label: 'Primer semestre' },
    { value: '2', label: 'Segundo semestre' }
  ];

  readonly activeStep = signal(1);
  readonly isLoading = signal(true);
  readonly isContinuing = signal(false);
  readonly isSavingClass = signal(false);
  readonly assignments = signal<PlanningUnitCatalogAssignment[]>([]);
  readonly availableCourses = signal<Course[]>([]);
  readonly availableSubjects = signal<Subject[]>([]);
  readonly classCatalogs = signal<PlanningClassCatalogs | null>(null);
  readonly availablePrograms = signal<StudyProgramSummary[]>([]);
  readonly selectedProgram = signal<StudyProgramDetail | null>(null);
  readonly selectedUnidad = signal<UnidadClase | null>(null);
  readonly year = signal('');
  readonly course = signal('');
  readonly subject = signal('');
  readonly prekinderAmbit = signal('');
  readonly prekinderNucleus = signal('');
  readonly prekinderVisibleSubjectKey = signal('');
  readonly semester = signal(String(resolveCurrentAcademicSemester()));
  readonly preferredUnitNumber = signal<number | null>(null);
  readonly preferredPlanningUnitId = signal<number | null>(null);
  readonly editingClassId = signal<number | null>(null);
  readonly hydratedClassId = signal<number | null>(null);
  readonly validationMessage = signal('');
  readonly step2ValidationMessage = signal('');
  readonly step3ValidationMessage = signal('');
  readonly isObjectiveModalOpen = signal(false);
  readonly isInitialEducationOaModalOpen = signal(false);
  readonly isInitialEducationActivityModalOpen = signal(false);
  readonly initialEducationObjectives = signal<InitialEducationObjectiveOption[]>([]);
  readonly selectedObjectiveTabKey = signal<string | null>(null);
  readonly selectedObjectiveIds = signal<string[]>([]);
  readonly expandedObjectiveIds = signal<string[]>([]);
  readonly classTitle = signal('');
  readonly classDate = signal('');
  readonly classDurationMinutes = signal(90);
  readonly startActivity = signal('');
  readonly developmentActivity = signal('');
  readonly closingActivity = signal('');
  readonly startStrategy = signal('Lluvia de ideas');
  readonly groupingMode = signal('Individual');
  readonly reflectionSuccess = signal('');
  readonly reflectionImprove = signal('');
  readonly objectiveAchievement = signal(75);
  readonly diversityNotes = signal('');
  readonly selectedLearningApproach = signal('Para el aprendizaje');
  readonly selectedInstrument = signal('Rubrica');
  readonly selectedEvaluationType = signal('Clase');
  readonly activeResources = signal<string[]>(['Guia impresa', 'Proyector']);
  readonly isGeneratingSuggestion = signal(false);
  readonly suggestionStatus = signal('La IA podra sugerir actividades, recursos y evaluacion a partir de los OA seleccionados.');
  readonly objectiveIndicators = signal<Record<string, string[]>>({});
  readonly dateConflictDialog = signal<{
    title: string;
    plannedDate: string;
    payload: PlanningClassPayload;
  } | null>(null);

  readonly startStrategyOptions = [
    'Lluvia de ideas',
    'Pregunta detonante',
    'Lectura guiada',
    'Video corto'
  ] as const;
  readonly groupingOptions = [
    'Individual',
    'Parejas',
    'Grupos pequenos',
    'Trabajo colaborativo'
  ] as const;
  readonly learningApproachOptions = [
    'Para el aprendizaje',
    'Como aprendizaje',
    'Del aprendizaje'
  ] as const;
  readonly instrumentOptions = [
    'Rubrica',
    'Lista de cotejo',
    'Ticket de salida',
    'Pregunta oral'
  ] as const;
  readonly evaluationTypeOptions = [
    'Clase',
    'Formativa',
    'Proceso',
    'Sumativa'
  ] as const;
  readonly resourceOptions = [
    'Guia impresa',
    'Proyector',
    'Texto escolar',
    'Material concreto',
    'Audio'
  ] as const;

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
  readonly selectedCourseModel = computed(() =>
    this.availableCourses().find((course) => String(course.id) === this.course()) ?? null
  );
  readonly isInitialEducationFlow = computed(() => this.matchesInitialEducationCourse(this.selectedCourseModel()));
  readonly unitSingularLabel = computed(() => this.isInitialEducationFlow() ? 'ámbito' : 'unidad');
  readonly unitPluralLabel = computed(() => this.isInitialEducationFlow() ? 'ámbitos' : 'unidades');
  readonly unitSingularLabelTitle = computed(() => this.isInitialEducationFlow() ? 'ámbito' : 'Unidad');
  readonly unitPluralLabelTitle = computed(() => this.isInitialEducationFlow() ? 'ámbitos' : 'Unidades');
  readonly initialEducationProgramGrade = computed(() => this.resolveInitialEducationProgramGrade(this.selectedCourseModel()));
  readonly prekinderSubjectOptions = computed<PrekinderSubjectOption[]>(() => {
    if (!this.isInitialEducationFlow()) {
      return [];
    }

    const subjects = this.availableSubjects();
    const courseId = Number(this.course());
    const collected = new Map<string, PrekinderSubjectOption>();

    this.prekinderMappings.forEach((mapping) => {
      const matchedSubjects = subjects.filter((subject) =>
        (!Number.isFinite(courseId) || (subject.applicableCourseIds ?? []).includes(courseId))
        && mapping.subjectAliases.some((alias) => this.normalizeCompare(subject.name) === this.normalizeCompare(alias))
      );

      matchedSubjects.forEach((subject) => {
        const option: PrekinderSubjectOption = {
          ...mapping,
          subjectId: String(subject.id),
          subjectName: subject.name
        };

        const dedupeKey = `${mapping.key}::${subject.id}`;
        if (!collected.has(dedupeKey)) {
          collected.set(dedupeKey, option);
        }
      });
    });

    return Array.from(collected.values());
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
  readonly filteredPrekinderSubjectOptions = computed<SelectOption[]>(() => {
    const options = this.prekinderSubjectOptions();
    const duplicatedLabels = new Set(
      options
        .map((item) => item.visibleLabel)
        .filter((label, index, array) => array.indexOf(label) !== index)
    );

    return options.map((item) => ({
      value: item.key,
      label: duplicatedLabels.has(item.visibleLabel)
        ? `${item.visibleLabel} · ${item.subjectName}`
        : item.visibleLabel
    }));
  });
  readonly selectedPrekinderSubject = computed(() =>
    this.prekinderSubjectOptions().find((item) => item.key === this.prekinderVisibleSubjectKey()) ?? null
  );
  readonly normalizedPrekinderSubjectOptions = computed<SelectOption[]>(() => {
    const labels = Array.from(new Set(this.prekinderSubjectOptions().map((item) => item.visibleLabel)));
    return labels.map((label) => ({ value: label, label }));
  });
  readonly resolvedPrekinderSubject = computed(() =>
    this.resolvePreferredPrekinderSubjectByVisibleLabel(this.prekinderVisibleSubjectKey())
  );
  readonly courseLabel = computed(() => this.findLabel(this.courses(), this.course()));
  readonly subjectLabel = computed(() => this.resolvedPrekinderSubject()?.visibleLabel ?? this.findLabel(this.subjects(), this.subject()));
  readonly programSubjectLabel = computed(() =>
    this.resolvedPrekinderSubject()?.programSubjectName ?? this.findLabel(this.subjects(), this.subject())
  );
  readonly initialEducationObjectiveOptions = computed<InitialEducationObjectiveOption[]>(() =>
    this.initialEducationObjectives()
  );
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
  readonly selectedInitialEducationIndicatorKeys = computed(() =>
    this.selectedObjectiveIds().flatMap((objectiveId) =>
      this.objectiveIndicatorValue(objectiveId).map((indicator) => `${objectiveId}::${indicator}`)
    )
  );
  readonly initialEducationActivitySuggestions = computed<InitialEducationActivitySuggestion[]>(() =>
    this.buildInitialEducationActivitySuggestions(this.selectedObjectives())
  );
  readonly semesterLabel = computed(() => this.semester() === '2' ? 'Segundo semestre' : 'Primer semestre');
  readonly matchedPlanningUnit = computed<PlanningClassCatalogUnit | null>(() => this.resolvePlanningClassUnit());
  readonly hasSelectionContext = computed(() =>
    !!this.year() && !!this.course() && !!this.subject() && !!this.semester()
  );
  readonly manualPlanningUnits = computed<PlanningClassCatalogUnit[]>(() => {
    return (this.classCatalogs()?.units ?? [])
      .filter((unit) => this.matchesSelectedCatalogContext(unit))
      .sort((left, right) => {
        const leftNumber = this.extractFirstNumber(left.unitNumberLabel) ?? 0;
        const rightNumber = this.extractFirstNumber(right.unitNumberLabel) ?? 0;
        if (leftNumber !== rightNumber) {
          return leftNumber - rightNumber;
        }

        return left.unitId - right.unitId;
      });
  });
  readonly filteredProgramUnits = computed<StudyProgramUnit[]>(() => {
    const selectedSemester = this.semesterLabel();
    return (this.selectedProgram()?.units ?? []).filter(
      (unit) => this.resolveSemesterLabel(unit) === selectedSemester
    );
  });
  readonly availableProgramObjectivesCount = computed(() =>
    this.filteredProgramUnits().reduce((total, unit) => total + (unit.objectives?.length ?? 0), 0)
  );
  readonly canCreateManualClass = computed(() => this.hasSelectionContext() && this.manualPlanningUnits().length > 0);

  readonly unidadesDisponibles = computed<UnidadClase[]>(() =>
    (this.isInitialEducationFlow()
      ? this.filteredProgramUnits().map((unit, index) => this.mapUnidadClase(unit, index))
      : this.manualPlanningUnits().map((unit, index) => this.mapPlanningCatalogUnit(unit, index))
    )
      .filter((item): item is UnidadClase => item !== null)
      .sort((left, right) => {
        if (left.numero !== right.numero) {
          return left.numero - right.numero;
        }

        return left.id - right.id;
      })
  );

  readonly axesText = computed(() => {
    const axes = this.selectedProgram()?.axes ?? [];
    return axes.length ? axes.join(' · ') : 'Sin ejes disponibles';
  });

  readonly unidadEjesTexto = computed(() => this.getEjesTexto(this.selectedUnidad()));
  readonly selectedProgramUnit = computed<StudyProgramUnit | null>(() => {
    const unitNumber = this.selectedUnidad()?.numero;
    if (unitNumber == null) {
      return null;
    }

    return this.filteredProgramUnits().find((unit) => unit.number === unitNumber) ?? null;
  });

  readonly objectiveOptions = computed<ObjetivoClase[]>(() =>
    (this.selectedProgramUnit()?.objectives ?? []).map((objective, index) => this.mapObjetivoClase(objective, index))
  );
  readonly objectiveTabs = computed<OaClaseTab[]>(() => this.buildObjectiveTabs());
  readonly activeObjectiveTab = computed<OaClaseTab | null>(() =>
    this.objectiveTabs().find((tab) => tab.key === this.selectedObjectiveTabKey()) ?? this.objectiveTabs()[0] ?? null
  );
  readonly activeObjectiveOptions = computed<ObjetivoClase[]>(() => this.activeObjectiveTab()?.objectives ?? []);
  readonly activeObjectiveSelectionState = computed(() => {
    const options = this.activeObjectiveOptions();
    if (!options.length) {
      return {
        total: 0,
        selected: 0,
        allSelected: false,
        partiallySelected: false
      };
    }

    const selectedIds = new Set(this.selectedObjectiveIds());
    const selected = options.filter((objective) => selectedIds.has(objective.id)).length;

    return {
      total: options.length,
      selected,
      allSelected: selected === options.length,
      partiallySelected: selected > 0 && selected < options.length
    };
  });
  readonly selectedObjectives = computed<ObjetivoClase[]>(() => {
    if (this.isInitialEducationFlow()) {
      return this.selectedObjectiveIds()
        .map((id) => this.mapInitialEducationObjectiveById(id))
        .filter((objective) => objective !== null) as ObjetivoClase[];
    }

    const selectedIds = new Set(this.selectedObjectiveIds());
    const collected = new Map<string, ObjetivoClase>();

    for (const tab of this.objectiveTabs()) {
      for (const objective of tab.objectives) {
        if (selectedIds.has(objective.id) && !collected.has(objective.id)) {
          collected.set(objective.id, objective);
        }
      }
    }

    return Array.from(collected.values());
  });
  readonly selectedClassAxes = computed(() => {
    const axes = new Set(
      this.selectedObjectives()
        .map((objective) => objective.eje?.trim())
        .filter((axis): axis is string => !!axis)
    );
    return Array.from(axes.values());
  });
  readonly classDurationLabel = computed(() => {
    const minutes = this.classDurationMinutes();
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return 'Sin duración definida';
    }
    return `${minutes} min`;
  });
  readonly selectedIndicatorsCount = computed(() =>
    this.selectedObjectives().reduce((total, objective) => total + this.objectiveIndicatorValue(objective.id).length, 0)
  );
  readonly classPreviewMetrics = computed<ClassMetric[]>(() => [
    {
      label: `${this.unitSingularLabelTitle()} seleccionad${this.isInitialEducationFlow() ? 'o' : 'a'}`,
      value: this.selectedUnidad()?.nombre ?? `Sin ${this.unitSingularLabel()} seleccionad${this.isInitialEducationFlow() ? 'o' : 'a'}`,
      icon: 'menu_book',
      tone: 'violet'
    },
    {
      label: 'Fecha de la clase',
      value: this.classDateLabel(),
      icon: 'calendar_month',
      tone: 'blue'
    },
    {
      label: 'OA seleccionados',
      value: String(this.selectedObjectives().length),
      icon: 'task_alt',
      tone: 'green'
    },
    {
      label: 'Indicadores',
      value: String(this.selectedIndicatorsCount()),
      icon: 'fact_check',
      tone: 'violet'
    },
    {
      label: 'Duracion estimada',
      value: this.classDurationLabel(),
      icon: 'schedule',
      tone: 'amber'
    }
  ]);
  readonly displayedSkills = computed(() => this.buildSuggestedSkills());
  readonly displayedAttitudes = computed(() => this.buildSuggestedAttitudes());
  readonly primarySelectedObjective = computed(() => this.selectedObjectives()[0] ?? null);
  readonly remainingSelectedObjectivesCount = computed(() => Math.max(this.selectedObjectives().length - 1, 0));

  readonly metricCards = computed<PreviewMetric[]>(() => {
    if (this.activeStep() === 2 || this.activeStep() === 3) {
      const unidad = this.selectedUnidad();
      return [
        {
          label: `${this.unitSingularLabelTitle()} seleccionad${this.isInitialEducationFlow() ? 'o' : 'a'}`,
          value: unidad?.nombre ?? `Sin ${this.unitSingularLabel()} seleccionad${this.isInitialEducationFlow() ? 'o' : 'a'}`,
          icon: 'menu_book',
          tone: 'violet'
        },
        {
          label: 'Duración estimada',
          value: unidad ? `${unidad.clasesEstimadas} clases` : '0 clases',
          icon: 'calendar_month',
          tone: 'violet'
        },
        {
          label: `OA disponibles en ${this.isInitialEducationFlow() ? 'el' : 'la'} ${this.unitSingularLabel()}`,
          value: String(unidad?.oaDisponibles ?? 0),
          icon: 'task_alt',
          tone: 'green'
        },
        {
          label: 'Ejes',
          value: this.getEjesTexto(unidad),
          icon: 'layers',
          tone: 'amber'
        }
      ];
    }

    if (this.activeStep() === 4) {
      return this.classPreviewMetrics();
    }

    const program = this.selectedProgram();
    return [
      {
        label: `${this.unitPluralLabelTitle()} disponibles`,
        value: String(this.filteredProgramUnits().length),
        icon: 'menu_book',
        tone: 'violet'
      },
      {
        label: 'OA disponibles',
        value: String(this.availableProgramObjectivesCount()),
        icon: 'task_alt',
        tone: 'green'
      },
      {
        label: 'Horas anuales',
        value: String(program?.totalHours ?? 0),
        icon: 'schedule',
        tone: 'amber'
      },
      {
        label: 'Ejes',
        value: this.axesText(),
        icon: 'layers',
        tone: 'blue'
      }
    ];
  });

  readonly programReference = computed(() => {
    const program = this.selectedProgram();
    if (!this.isInitialEducationFlow() && this.hasSelectionContext() && !this.manualPlanningUnits().length) {
      return 'Para crear una nueva clase primero debes crear una unidad en Planificaciones para esta asignatura.';
    }

    if (this.isInitialEducationFlow()) {
      if (this.hasInitialEducationCurriculum()) {
        return `Ruta curricular de educacion inicial cargada para ${this.initialEducationProgramGrade() ?? 'educacion inicial'} · ${this.subjectLabel()} · ${this.prekinderAmbit()} · ${this.prekinderNucleus()}.`;
      }

      return this.canCreateManualClass()
        ? 'No se encontro una ruta curricular de educacion inicial para la selección actual. Puedes crear la clase usando un ámbito ya guardado en Planificaciones.'
        : 'No se encontro una ruta curricular de educacion inicial para la selección actual.';
    }

    if (!program) {
      return this.canCreateManualClass()
        ? 'No se encontro un programa oficial disponible para la selección actual. Puedes crear la clase usando una unidad ya guardada en Planificaciones.'
        : 'No se encontro un programa oficial disponible para la selección actual.';
    }
    return `Estas unidades pertenecen al ${program.grade}, ${program.decree}, ${program.edition}.`;
  });
  readonly classDateLabel = computed(() => {
    const value = this.classDate();
    if (!value) {
      return 'Fecha pendiente';
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return value;
    }

    const formatter = new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return formatter.format(new Date(year, month - 1, day));
  });

  constructor() {
    this.loadSubjects();
    this.loadCourses();
    this.loadCatalogs();
  }

  cancel(): void {
    this.router.navigate(['/dashboard/planificaciones-nuevo'], {
      queryParams: {
        year: this.year() || undefined,
        courseId: this.course() || undefined,
        subjectId: this.subject() || undefined,
        semester: this.semester() || undefined,
        unitId: this.preferredPlanningUnitId() ?? this.matchedPlanningUnit()?.unitId ?? undefined
      }
    });
  }

  updateYear(value: string): void {
    this.year.set(value);
    this.syncCourseSelection();
    this.syncSubjectSelection();
    this.syncPrekinderSelectorsFromCurrentSubject();
    this.loadProgramForSelection();
  }

  updateCourse(value: string): void {
    this.course.set(value);
    this.syncSubjectSelection();
    this.syncPrekinderSelectorsFromCurrentSubject();
    this.loadProgramForSelection();
  }

  updateSubject(value: string): void {
    this.subject.set(value);
    this.syncPrekinderSelectorsFromCurrentSubject();
    this.loadProgramForSelection();
  }

  updatePrekinderAmbit(value: string): void {
    this.prekinderAmbit.set(value);
    this.syncPrekinderNucleusSelection();
    this.syncPrekinderVisibleSubjectSelection();
    this.loadProgramForSelection();
  }

  updatePrekinderNucleus(value: string): void {
    this.prekinderNucleus.set(value);
    this.syncPrekinderVisibleSubjectSelection();
    this.loadProgramForSelection();
  }

  updatePrekinderVisibleSubject(value: string): void {
    this.prekinderVisibleSubjectKey.set(value);
    const selected = this.resolvePreferredPrekinderSubjectByVisibleLabel(value);
    this.prekinderAmbit.set(selected?.ambit ?? '');
    this.prekinderNucleus.set(selected?.nucleus ?? '');
    this.subject.set(selected?.subjectId ?? '');
    this.loadProgramForSelection();
  }

  updateSemester(value: string): void {
    this.semester.set(value);
    this.loadProgramForSelection();
  }

  canNavigateToStep(stepNumber: number): boolean {
    if (stepNumber === this.activeStep()) {
      return true;
    }

    if (this.isInitialEducationFlow()) {
      switch (stepNumber) {
        case 1:
          return true;
        case 3:
          return this.hasStep1Data() && !!this.selectedUnidad();
        case 4:
          return this.selectedObjectiveIds().length > 0;
        default:
          return false;
      }
    }

    switch (stepNumber) {
      case 1:
        return true;
      case 2:
        return this.hasStep1Data();
      case 3:
        return this.hasStep1Data() && !!this.selectedUnidad();
      case 4:
        return this.selectedObjectiveIds().length > 0;
      default:
        return false;
    }
  }

  goToStep(stepNumber: number): void {
    if (!this.canNavigateToStep(stepNumber)) {
      return;
    }

    this.validationMessage.set('');
    this.step2ValidationMessage.set('');
    this.step3ValidationMessage.set('');

    if (stepNumber === 1) {
      this.isObjectiveModalOpen.set(false);
      this.activeStep.set(1);
      return;
    }

    if (stepNumber === 2) {
      this.isObjectiveModalOpen.set(false);
      this.activeStep.set(2);
      return;
    }

    if (stepNumber === 3) {
      if (this.activeStep() < 3) {
        this.continueFromStep2();
        return;
      }

      this.isObjectiveModalOpen.set(false);
      this.activeStep.set(3);
      return;
    }

    if (stepNumber === 4) {
      if (this.activeStep() < 4) {
        this.continueFromStep3();
        return;
      }

      this.isObjectiveModalOpen.set(false);
      this.activeStep.set(4);
    }
  }

  continue(): void {
    if (!this.isInitialEducationFlow() && this.activeStep() === 2) {
      this.continueFromStep2();
      return;
    }

    if (this.activeStep() === 3) {
      this.continueFromStep3();
      return;
    }

    if (!this.year() || !this.course() || !this.subject() || !this.semester()) {
      this.validationMessage.set('Debes completar año, curso, asignatura y semestre para continuar.');
      return;
    }

    if (this.isInitialEducationFlow()) {
      if (!this.initialEducationObjectiveOptions().length) {
        this.validationMessage.set('No hay OA disponibles para esta seleccion de educacion inicial.');
        return;
      }

      this.validationMessage.set('');
      this.step2ValidationMessage.set('');
      this.step3ValidationMessage.set('');
      this.isContinuing.set(true);

      setTimeout(() => {
        this.isContinuing.set(false);
        if (!this.selectedUnidad()) {
          this.selectedUnidad.set(this.unidadesDisponibles()[0] ?? this.buildInitialEducationDraftContext());
        }
        this.activeStep.set(3);
        this.openInitialEducationOaModal();
      }, 250);
      return;
    }

    if (!this.manualPlanningUnits().length) {
      this.validationMessage.set('Primero debes crear una unidad en Planificaciones para esta asignatura.');
      return;
    }

    if (!this.selectedProgram()) {
      this.validationMessage.set('No se encontro un programa oficial asociado a la selección actual.');
      return;
    }

    this.validationMessage.set('');
    this.step2ValidationMessage.set('');
    this.isContinuing.set(true);

    setTimeout(() => {
      this.isContinuing.set(false);
      if (this.isInitialEducationFlow()) {
        if (!this.selectedUnidad()) {
          this.selectedUnidad.set(this.unidadesDisponibles()[0] ?? null);
        }
        this.step3ValidationMessage.set('');
        this.activeStep.set(3);
        this.openInitialEducationOaModal();
      } else {
        this.activeStep.set(2);
        if (!this.selectedUnidad()) {
          this.selectedUnidad.set(this.unidadesDisponibles()[0] ?? null);
        }
      }
      if (!this.selectedObjectiveTabKey()) {
        this.selectedObjectiveTabKey.set(this.objectiveTabs()[0]?.key ?? null);
      }
    }, 250);
  }

  createManualClass(): void {
    if (!this.hasSelectionContext()) {
      this.validationMessage.set('Debes completar año, curso, asignatura y semestre para crear una clase manual.');
      return;
    }

    if (this.isInitialEducationFlow()) {
      if (!this.initialEducationObjectiveOptions().length) {
        this.validationMessage.set('No hay OA disponibles para esta seleccion de educacion inicial.');
        return;
      }

      this.validationMessage.set('');
      this.step2ValidationMessage.set('');
      this.step3ValidationMessage.set('');
      if (!this.selectedUnidad()) {
        this.selectedUnidad.set(this.unidadesDisponibles()[0] ?? this.buildInitialEducationDraftContext());
      }
      this.activeStep.set(3);
      this.openInitialEducationOaModal();
      return;
    }

    if (!this.manualPlanningUnits().length) {
      this.validationMessage.set(`Primero debes crear ${this.isInitialEducationFlow() ? 'un ámbito' : 'una unidad'} en Planificaciones para esta asignatura.`);
      return;
    }

    this.validationMessage.set('');
    this.step2ValidationMessage.set('');
    this.step3ValidationMessage.set('');
    if (!this.selectedUnidad()) {
      this.selectedUnidad.set(this.unidadesDisponibles()[0] ?? null);
    }
    if (this.isInitialEducationFlow()) {
      this.activeStep.set(3);
      this.openInitialEducationOaModal();
      return;
    }

    this.activeStep.set(2);
  }

  goToManualUnit(): void {
    void this.router.navigate([this.resolveUnitEditorRoute()], {
      queryParams: {
        year: this.year() || undefined,
        courseId: this.course() || undefined,
        subjectId: this.subject() || undefined,
        semester: this.semester() || undefined
      }
    });
  }

  volver(): void {
    if (this.isObjectiveModalOpen()) {
      this.closeObjectiveModal();
      return;
    }

    if (!this.isInitialEducationFlow() && this.activeStep() === 2) {
      this.activeStep.set(1);
      this.step2ValidationMessage.set('');
      return;
    }

    if (this.activeStep() === 3) {
      this.activeStep.set(this.isInitialEducationFlow() ? 1 : 2);
      this.step3ValidationMessage.set('');
      return;
    }

    if (this.activeStep() === 4) {
      this.activeStep.set(3);
      return;
    }

    this.cancel();
  }

  selectUnidad(unidad: UnidadClase): void {
    this.selectedUnidad.set(unidad);
    this.step2ValidationMessage.set('');
    this.selectedObjectiveTabKey.set(this.objectiveTabs()[0]?.key ?? null);
    this.selectedObjectiveIds.set([]);
    this.objectiveIndicators.set({});
    this.expandedObjectiveIds.set([]);
  }

  isStepActive(stepNumber: number): boolean {
    return this.activeStep() === stepNumber;
  }

  isStepCompleted(stepNumber: number): boolean {
    return stepNumber < this.activeStep();
  }

  getEjesTexto(unidad: UnidadClase | null): string {
    return unidad?.ejes?.length ? unidad.ejes.join(' · ') : 'Sin ejes disponibles';
  }

  selectedUnitFullLabel(): string {
    const unidad = this.selectedUnidad();
    if (!unidad) {
      return `Sin ${this.unitSingularLabel()} seleccionad${this.isInitialEducationFlow() ? 'o' : 'a'}`;
    }

    return `Unidad ${unidad.numero} · ${unidad.nombre}`;
  }

  selectedContextFullLabel(): string {
    const unidad = this.selectedUnidad();
    if (!unidad) {
      return `Sin ${this.unitSingularLabel()} seleccionad${this.isInitialEducationFlow() ? 'o' : 'a'}`;
    }

    return `${this.unitSingularLabelTitle()} ${unidad.numero} - ${unidad.nombre}`;
  }

  showSelectedUnitFullName(): void {
    this.snackBar.open(this.selectedContextFullLabel(), 'Cerrar', {
      duration: 6000,
      horizontalPosition: 'center'
    });
  }

  selectObjectiveTab(tabKey: string): void {
    this.selectedObjectiveTabKey.set(tabKey);
  }

  openObjectiveModal(): void {
    if (this.isInitialEducationFlow()) {
      this.openInitialEducationOaModal();
      return;
    }

    if (this.activeStep() === 4) {
      this.isObjectiveModalOpen.set(true);
      this.step3ValidationMessage.set('');
      return;
    }

    this.activeStep.set(3);
  }

  closeObjectiveModal(): void {
    if (this.isInitialEducationFlow()) {
      this.closeInitialEducationOaModal();
      return;
    }

    if (this.activeStep() === 3 && !this.isObjectiveModalOpen()) {
      this.activeStep.set(2);
    }

    this.isObjectiveModalOpen.set(false);
    this.step3ValidationMessage.set('');
  }

  private resolveUnitEditorRoute(): string {
    return this.isInitialEducationFlow()
      ? '/dashboard/planificaciones-nuevo/nuevo-ámbito'
      : '/dashboard/planificaciones-nuevo/nueva-unidad';
  }

  confirmObjectiveModal(): void {
    if (this.isInitialEducationFlow()) {
      return;
    }

    if (!this.selectedObjectiveIds().length) {
      this.step3ValidationMessage.set('Debes seleccionar al menos un OA para continuar.');
      return;
    }

    if (!this.validateObjectiveIndicators()) {
      return;
    }

    if (this.activeStep() === 4 || this.isObjectiveModalOpen()) {
      this.closeObjectiveModal();
      return;
    }

    this.continueFromStep3();
  }

  toggleObjectiveSelection(objectiveId: string): void {
    const isSelected = this.selectedObjectiveIds().includes(objectiveId);
    this.selectedObjectiveIds.update((current) =>
      isSelected
        ? current.filter((item) => item !== objectiveId)
        : [...current, objectiveId]
    );

    if (isSelected) {
      this.objectiveIndicators.update((current) => {
        const next = { ...current };
        delete next[objectiveId];
        return next;
      });
    } else {
      this.ensureObjectiveIndicatorsForSelection(objectiveId);
      this.expandObjectiveAccordion(objectiveId);
    }

    this.step3ValidationMessage.set('');
  }

  openInitialEducationOaModal(): void {
    this.isInitialEducationOaModalOpen.set(true);
  }

  closeInitialEducationOaModal(): void {
    this.isInitialEducationOaModalOpen.set(false);
    if (this.activeStep() === 3) {
      this.activeStep.set(1);
    }
  }

  applyInitialEducationOas(objectives: InitialEducationSelectedObjective[]): void {
    const objectiveIds = objectives.map((objective) => objective.id);
    const indicators = objectives.reduce<Record<string, string[]>>((acc, objective) => {
      acc[objective.id] = objective.evaluationIndicators ?? [];
      return acc;
    }, {});

    this.selectedObjectiveIds.set(objectiveIds);
    this.objectiveIndicators.set(indicators);
    this.expandedObjectiveIds.set([]);
    this.isInitialEducationOaModalOpen.set(false);
    this.step3ValidationMessage.set('');
    this.initializeStep4State();
    this.activeStep.set(4);
    this.snackBar.open(`${objectives.length} OA seleccionados para educacion inicial.`, 'Cerrar', {
      duration: 2800
    });
  }

  openInitialEducationActivityModal(): void {
    if (!this.isInitialEducationFlow()) {
      return;
    }

    if (!this.selectedObjectives().length) {
      this.snackBar.open('Primero debes seleccionar al menos un OA para sugerir actividades.', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (!this.initialEducationActivitySuggestions().length) {
      this.snackBar.open('Todavia no hay actividades sugeridas para esta seleccion.', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.isInitialEducationActivityModalOpen.set(true);
  }

  closeInitialEducationActivityModal(): void {
    this.isInitialEducationActivityModalOpen.set(false);
  }

  applyInitialEducationActivitySuggestion(suggestion: InitialEducationActivitySuggestion): void {
    if (!this.classTitle().trim()) {
      this.classTitle.set(suggestion.title);
    }

    this.startActivity.set(suggestion.startActivity);
    this.developmentActivity.set(suggestion.developmentActivity);
    this.closingActivity.set(suggestion.closingActivity);
    this.suggestionStatus.set(`Actividad sugerida aplicada: ${suggestion.title}.`);
    this.isInitialEducationActivityModalOpen.set(false);
    this.snackBar.open(`Se aplicó la sugerencia "${suggestion.title}".`, 'Cerrar', {
      duration: 3200
    });
  }

  isObjectiveSelected(objectiveId: string): boolean {
    return this.selectedObjectiveIds().includes(objectiveId);
  }

  toggleObjectiveAccordion(objectiveId: string): void {
    this.expandedObjectiveIds.update((current) =>
      current.includes(objectiveId)
        ? current.filter((item) => item !== objectiveId)
        : [...current, objectiveId]
    );
  }

  isObjectiveAccordionOpen(objectiveId: string): boolean {
    return this.expandedObjectiveIds().includes(objectiveId);
  }

  toggleActiveObjectiveSelection(): void {
    const options = this.activeObjectiveOptions();
    if (!options.length) {
      return;
    }

    const optionIds = options.map((objective) => objective.id);
    const optionIdSet = new Set(optionIds);
    const shouldSelectAll = !this.activeObjectiveSelectionState().allSelected;

    this.selectedObjectiveIds.update((current) => {
      const preserved = current.filter((id) => !optionIdSet.has(id));
      return shouldSelectAll ? [...preserved, ...optionIds] : preserved;
    });

    if (shouldSelectAll) {
      for (const objectiveId of optionIds) {
        this.ensureObjectiveIndicatorsForSelection(objectiveId);
      }
    } else {
      this.objectiveIndicators.update((current) => {
        const next = { ...current };
        for (const objectiveId of optionIds) {
          delete next[objectiveId];
        }
        return next;
      });
    }

    this.step3ValidationMessage.set('');
  }

  updateClassTitle(value: string): void {
    this.classTitle.set(value);
  }

  updateClassDate(value: string): void {
    this.classDate.set(value);
  }

  updateClassDurationMinutes(value: number | string): void {
    const parsed = Number(value);
    this.classDurationMinutes.set(Number.isFinite(parsed) && parsed > 0 ? parsed : 90);
  }

  updateStartStrategy(value: string): void {
    this.startStrategy.set(value);
  }

  updateGroupingMode(value: string): void {
    this.groupingMode.set(value);
  }

  updateStartActivity(value: string): void {
    this.startActivity.set(value);
  }

  updateDevelopmentActivity(value: string): void {
    this.developmentActivity.set(value);
  }

  updateClosingActivity(value: string): void {
    this.closingActivity.set(value);
  }

  updateReflectionSuccess(value: string): void {
    this.reflectionSuccess.set(value);
  }

  updateReflectionImprove(value: string): void {
    this.reflectionImprove.set(value);
  }

  updateObjectiveAchievement(value: number | string): void {
    const parsed = Number(value);
    this.objectiveAchievement.set(Number.isFinite(parsed) ? parsed : 75);
  }

  updateDiversityNotes(value: string): void {
    this.diversityNotes.set(value);
  }

  updateLearningApproach(value: string): void {
    this.selectedLearningApproach.set(value);
  }

  updateInstrument(value: string): void {
    this.selectedInstrument.set(value);
  }

  updateEvaluationType(value: string): void {
    this.selectedEvaluationType.set(value);
  }

  toggleObjectiveIndicator(objectiveId: string, indicator: string): void {
    this.objectiveIndicators.update((current) => {
      const currentIndicators = current[objectiveId] ?? [];
      const exists = currentIndicators.includes(indicator);
      return {
        ...current,
        [objectiveId]: exists
          ? currentIndicators.filter((item) => item !== indicator)
          : [indicator, ...currentIndicators]
      };
    });
    this.step3ValidationMessage.set('');
  }

  objectiveIndicatorValue(objectiveId: string): string[] {
    return this.objectiveIndicators()[objectiveId] ?? [];
  }

  hasObjectiveIndicator(objectiveId: string, indicator: string): boolean {
    return this.objectiveIndicatorValue(objectiveId).includes(indicator);
  }

  previewObjectiveIndicator(objectiveId: string): string {
    return this.objectiveIndicatorValue(objectiveId)[0] ?? '';
  }

  previewObjectiveIndicatorOverflow(objectiveId: string): number {
    return Math.max(this.objectiveIndicatorValue(objectiveId).length - 1, 0);
  }

  toggleResource(value: string): void {
    this.activeResources.update((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  hasActiveResource(value: string): boolean {
    return this.activeResources().includes(value);
  }

  generateClassSuggestion(): void {
    const suggestionPayload = this.buildSuggestionPayload();
    if (!suggestionPayload) {
      this.snackBar.open('Debes seleccionar al menos un OA para generar la clase con IA.', 'Cerrar', {
        duration: 3200
      });
      return;
    }

    if (this.isGeneratingSuggestion()) {
      return;
    }

    this.isGeneratingSuggestion.set(true);
    this.suggestionStatus.set(`Leyendo datos del OA ${suggestionPayload.objectiveCode}...`);

    this.planningApiService.generateClassSuggestion(suggestionPayload).subscribe({
      next: (suggestion) => {
        const currentTitle = this.classTitle().trim();
        this.classTitle.set(currentTitle || suggestion.title);
        this.startActivity.set(suggestion.startActivity);
        this.developmentActivity.set(suggestion.developmentActivity);
        this.closingActivity.set(suggestion.closingActivity);

        if (!this.diversityNotes().trim()) {
          this.diversityNotes.set(suggestion.diversitySupport);
        }

        const providerLabel = this.resolveSuggestionProviderLabel(suggestion.providerUsed, suggestion.statusMessage);

        this.isGeneratingSuggestion.set(false);
        this.suggestionStatus.set(`${suggestion.statusMessage} Proveedor: ${providerLabel}.`);
        this.snackBar.open(
          `Sugerencia aplicada desde ${providerLabel} para ${suggestionPayload.objectiveCode}.`,
          'Cerrar',
          { duration: 3600 }
        );
      },
      error: (error: HttpErrorResponse) => {
        this.isGeneratingSuggestion.set(false);
        this.suggestionStatus.set('No fue posible generar la sugerencia de clase.');
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible generar la sugerencia de clase.',
          'Cerrar',
          { duration: 3600 }
        );
      }
    });
  }

  saveClass(): void {
    if (this.isSavingClass()) {
      return;
    }

    const payload = this.buildClassPayload();
    if (!payload) {
      return;
    }

    this.isSavingClass.set(true);
    this.planningApiService.getClasses({
      year: Number(this.year()) || undefined,
      courseId: Number(this.course()) || undefined,
      subjectId: Number(this.subject()) || undefined,
      semester: Number(this.semester()) || undefined
    }).subscribe({
      next: (classes) => {
        const conflict = this.findDateConflict(classes, payload);
        if (conflict) {
          this.isSavingClass.set(false);
          this.dateConflictDialog.set({
            title: conflict.title,
            plannedDate: payload.plannedDate,
            payload
          });
          return;
        }

        this.persistClass(payload);
      },
      error: () => {
        this.persistClass(payload);
      }
    });
  }

  cancelDateConflict(): void {
    this.dateConflictDialog.set(null);
  }

  confirmDateConflict(): void {
    const dialog = this.dateConflictDialog();
    if (!dialog || this.isSavingClass()) {
      return;
    }

    this.dateConflictDialog.set(null);
    this.persistClass(dialog.payload);
  }

  private persistClass(payload: PlanningClassPayload): void {
    this.isSavingClass.set(true);
    const editingClassId = this.editingClassId();
    const request$ = editingClassId != null
      ? this.planningApiService.updateClass(editingClassId, payload)
      : this.planningApiService.createClass(payload);

    request$.subscribe({
      next: (planningClass) => {
        this.isSavingClass.set(false);
        this.snackBar.open(editingClassId != null ? 'Clase actualizada correctamente.' : 'Clase guardada correctamente.', 'Cerrar', {
          duration: 3200
        });
        void this.router.navigate(['/dashboard/planificaciones-nuevo'], {
          queryParams: {
            year: this.year() || undefined,
            courseId: this.course() || undefined,
            subjectId: this.subject() || undefined,
            semester: this.semester() || undefined,
            unitId: planningClass.unitId
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingClass.set(false);
        this.showError(error, 'No fue posible guardar la clase.');
      }
    });
  }

  private findDateConflict(classes: PlanningClass[], payload: PlanningClassPayload): PlanningClass | null {
    const editingClassId = this.editingClassId();
    return classes.find((planningClass) =>
      planningClass.plannedDate === payload.plannedDate &&
      planningClass.id !== editingClassId
    ) ?? null;
  }

  formatDateForWarning(value: string): string {
    const [year, month, day] = value.split('-');
    return day && month && year ? `${day}-${month}-${year}` : value;
  }

  private loadCatalogs(): void {
    this.isLoading.set(true);
    forkJoin({
      unitCatalogs: this.planningApiService.getUnitCatalogs(),
      classCatalogs: this.planningApiService.getClassCatalogs()
    }).subscribe({
      next: ({ unitCatalogs, classCatalogs }) => {
        this.assignments.set(unitCatalogs.teachingAssignments);
        this.classCatalogs.set(classCatalogs);
        this.initializeSelectionsFromRoute();
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
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos disponibles')
    });
  }

  private loadSubjects(): void {
    this.subjectApiService.findAll().subscribe({
      next: (subjects) => {
        this.availableSubjects.set(subjects.filter((subject) => subject.active));
        this.syncSubjectSelection();
        this.loadProgramForSelection();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar las asignaturas disponibles')
    });
  }

  private initializeSelectionsFromRoute(): void {
    const yearParam = this.route.snapshot.queryParamMap.get('year');
    const courseIdParam = this.route.snapshot.queryParamMap.get('courseId');
    const subjectIdParam = this.route.snapshot.queryParamMap.get('subjectId');
    const semesterParam = this.route.snapshot.queryParamMap.get('semester');
    const unitNumberParam = this.route.snapshot.queryParamMap.get('unitNumber');
    const unitIdParam = this.route.snapshot.queryParamMap.get('unitId');
    const classIdParam = this.route.snapshot.queryParamMap.get('classId');

    const years = this.years();
    this.year.set(years.some((item) => item.value === yearParam) ? yearParam! : (years[0]?.value ?? '2026'));
    this.syncCourseSelection(courseIdParam ?? undefined);
    this.syncSubjectSelection(subjectIdParam ?? undefined);
    this.syncPrekinderSelectorsFromCurrentSubject();
    this.semester.set(
      semesterParam === '1' || semesterParam === '2'
        ? semesterParam
        : String(resolveCurrentAcademicSemester())
    );
    this.preferredUnitNumber.set(unitNumberParam ? Number(unitNumberParam) : null);
    this.preferredPlanningUnitId.set(unitIdParam ? Number(unitIdParam) : null);
    this.editingClassId.set(classIdParam ? Number(classIdParam) : null);
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
    const subjectName = this.programSubjectLabel();
    const grade = this.initialEducationProgramGrade() ?? this.extractGradeFromCourse(this.courseLabel());
    this.loadInitialEducationCurriculumForSelection();

    if (!subjectName || !grade) {
      if (requestId === this.programLookupRequestId) {
        this.availablePrograms.set([]);
        this.selectedProgram.set(null);
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
            const availableUnits = this.unidadesDisponibles();
            const preferredUnit = availableUnits.find((unit) => unit.numero === this.preferredUnitNumber()) ?? null;
            const firstUnit = preferredUnit ?? availableUnits[0] ?? null;
            this.selectedUnidad.set(firstUnit);
            this.selectedObjectiveTabKey.set(firstUnit ? `unit-${firstUnit.numero}` : null);
            if (this.editingClassId() != null) {
              this.hydrateEditingClass();
              return;
            }

            this.applyPreferredPlanningUnitDefaults();
          },
          error: (error: HttpErrorResponse) => {
            if (requestId !== this.programLookupRequestId) {
              return;
            }

            this.selectedProgram.set(null);
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
        this.selectedUnidad.set(null);
        this.isLoading.set(false);
        this.showError(error, 'No fue posible buscar el programa oficial');
      }
    });
  }

  private extractGradeFromCourse(courseName: string): string {
    if (!courseName) {
      return '';
    }

    return courseName.replace(/\s+[A-Z]$/i, '').trim();
  }

  private resolveInitialEducationProgramGrade(course: Course | null): 'NT1' | 'NT2' | null {
    if (!course) {
      return null;
    }

    return [
      course.name,
      course.level,
      course.code,
      course.letter
    ].reduce<'NT1' | 'NT2' | null>((resolved, value) => {
      if (resolved) {
        return resolved;
      }

      const normalized = this.normalizeCompare(String(value ?? ''));
      if (normalized.includes('prekinder') || normalized.includes('pre kinder') || normalized.includes('nt1')) {
        return 'NT1';
      }
      if (normalized.includes('kinder') || normalized.includes('nt2')) {
        return 'NT2';
      }

      return null;
    }, null);
  }

  private matchesInitialEducationCourse(course: Course | null): boolean {
    if (!course) {
      return false;
    }

    return [
      course.name,
      course.level,
      course.code,
      course.letter
    ].some((value) => {
      const normalized = this.normalizeCompare(String(value ?? ''));
      return normalized.includes('prekinder')
        || normalized.includes('pre kinder')
        || normalized.includes('kinder')
        || normalized.includes('nt1')
        || normalized.includes('nt2');
    });
  }

  private syncPrekinderSelectorsFromCurrentSubject(): void {
    if (!this.isInitialEducationFlow()) {
      this.prekinderAmbit.set('');
      this.prekinderNucleus.set('');
      this.prekinderVisibleSubjectKey.set('');
      this.initialEducationObjectives.set([]);
      return;
    }

    const currentVisibleLabel = this.prekinderVisibleSubjectKey();
    const selectedByLabel = this.resolvePreferredPrekinderSubjectByVisibleLabel(currentVisibleLabel);
    if (selectedByLabel) {
      this.prekinderVisibleSubjectKey.set(selectedByLabel.visibleLabel);
      this.prekinderAmbit.set(selectedByLabel.ambit);
      this.prekinderNucleus.set(selectedByLabel.nucleus);
      this.subject.set(selectedByLabel.subjectId);
      return;
    }

    const currentSubjectId = this.subject();
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
    const options = this.normalizedPrekinderSubjectOptions();
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

    const normalizedVisibleLabel = this.normalizeCompare(visibleLabel);
    const matches = this.prekinderSubjectOptions()
      .filter((item) => this.normalizeCompare(item.visibleLabel) === normalizedVisibleLabel);

    if (!matches.length) {
      return null;
    }

    const currentSubjectId = this.subject();
    return matches.find((item) => item.subjectId === currentSubjectId) ?? matches[0] ?? null;
  }

  private findLabel(options: SelectOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? '';
  }

  private hasStep1Data(): boolean {
    return !!this.year() && !!this.course() && !!this.subject() && !!this.semester();
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    const message = typeof error.error?.message === 'string' ? error.error.message : fallback;
    this.validationMessage.set(message);
    this.snackBar.open(message, 'Cerrar', { duration: 3500 });
  }

  private continueFromStep2(): void {
    if (!this.selectedUnidad()) {
      this.step2ValidationMessage.set(`Debes seleccionar ${this.isInitialEducationFlow() ? 'un ámbito' : 'una unidad'} para continuar.`);
      return;
    }

    this.step2ValidationMessage.set('');
    if (!this.selectedProgram()) {
      this.initializeStep4State();
      this.activeStep.set(4);
      return;
    }

    this.activeStep.set(3);
    this.selectedObjectiveTabKey.set(this.objectiveTabs()[0]?.key ?? null);
  }

  private continueFromStep3(): void {
    if (!this.selectedProgram()) {
      this.step3ValidationMessage.set('');
      this.initializeStep4State();
      this.activeStep.set(4);
      return;
    }

    if (!this.selectedObjectiveIds().length) {
      this.step3ValidationMessage.set('Debes seleccionar al menos un OA para continuar.');
      return;
    }

    this.step3ValidationMessage.set('');
    this.initializeStep4State();
    this.activeStep.set(4);
  }

  private mapUnidadClase(unit: StudyProgramUnit, index: number): UnidadClase | null {
    if (!unit) {
      return null;
    }

    const ejes = Array.from(
      new Set((unit.objectives ?? []).map((objective) => objective.axis).filter((axis) => !!axis))
    );

    return {
      id: unit.number ?? index + 1,
      numero: unit.number ?? index + 1,
      nombre: unit.name,
      clasesEstimadas: unit.estimatedHours ?? 0,
      oaDisponibles: unit.objectives?.length ?? 0,
      ejes
    };
  }

  private buildInitialEducationDraftContext(): UnidadClase {
    const objectives = this.initialEducationObjectiveOptions();
    return {
      id: -1,
      numero: 1,
      nombre: this.prekinderAmbit() || this.subjectLabel() || 'ámbito inicial',
      clasesEstimadas: 1,
      oaDisponibles: objectives.length,
      ejes: this.prekinderNucleus() ? [this.prekinderNucleus()] : []
    };
  }

  private mapPlanningCatalogUnit(unit: PlanningClassCatalogUnit, index: number): UnidadClase | null {
    if (!unit) {
      return null;
    }

    return {
      id: unit.unitId,
      numero: this.extractFirstNumber(unit.unitNumberLabel) || index + 1,
      nombre: unit.unitName,
      clasesEstimadas: 0,
      oaDisponibles: 0,
      ejes: []
    };
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

  private mapObjetivoClase(objective: StudyProgramObjectiveDetail, index: number): ObjetivoClase {
    const catalogObjective = this.findCatalogObjective(objective.code);

    return {
      id: catalogObjective?.id ?? `${objective.code}-${index}`,
      sourceObjectiveId: catalogObjective?.id ?? null,
      codigo: objective.code.replace(/\s+/g, ''),
      descripcion: objective.description,
      eje: objective.axis || 'Lectura',
      evaluationIndicators: objective.evaluationIndicators ?? [],
      skills: catalogObjective?.skills ?? [],
      attitudes: catalogObjective?.attitudes ?? []
    };
  }

  private buildObjectiveTabs(): OaClaseTab[] {
    const currentUnit = this.selectedUnidad();
    const currentProgramUnit = this.selectedProgramUnit();

    if (!currentUnit || !currentProgramUnit) {
      return [];
    }

    const tabs: OaClaseTab[] = [
      {
        key: `unit-${currentUnit.numero}`,
        name: `Unidad ${currentUnit.numero}`,
        type: 'unit',
        objectives: this.objectiveOptions()
      }
    ];

    const transversalObjectives = this.buildTransversalObjectives();
    if (transversalObjectives.length) {
      tabs.push({
        key: 'transversal',
        name: 'Transversal',
        type: 'transversal',
        helperText: 'Estos objetivos pueden trabajarse de forma transversal durante el año o quedaron fuera de esta planificación. Puedes agregarlos manualmente a una clase desde esta unidad.',
        objectives: transversalObjectives
      });
    }

    return tabs;
  }

  private buildTransversalObjectives(): ObjetivoClase[] {
    const program = this.selectedProgram();
    if (!program) {
      return [];
    }

    const unitObjectiveCodes = new Set(
      (program.units ?? [])
        .flatMap((unit) => unit.objectives ?? [])
        .map((objective) => objective.code.trim().toUpperCase().replace(/\s+/g, ''))
    );

    const selectedUnitCodes = new Set(this.objectiveOptions().map((objective) => objective.codigo.trim().toUpperCase()));
    const collected = new Map<string, ObjetivoClase>();

    for (const objective of program.permanentObjectives ?? []) {
      const code = objective.code.trim().toUpperCase().replace(/\s+/g, '');
      if (!code || selectedUnitCodes.has(code) || collected.has(code)) {
        continue;
      }

      collected.set(code, {
        id: this.findCatalogObjective(objective.code)?.id ?? `transversal-permanent-${code}`,
        sourceObjectiveId: this.findCatalogObjective(objective.code)?.id ?? null,
        codigo: objective.code.replace(/\s+/g, ''),
        descripcion: objective.description,
        eje: objective.axis || 'Lectura',
        evaluationIndicators: objective.evaluationIndicators ?? [],
        skills: this.findCatalogObjective(objective.code)?.skills ?? [],
        attitudes: this.findCatalogObjective(objective.code)?.attitudes ?? []
      });
    }

    for (const objective of program.objectiveCatalog ?? []) {
      const code = objective.code.trim().toUpperCase().replace(/\s+/g, '');
      if (!code || selectedUnitCodes.has(code) || collected.has(code)) {
        continue;
      }

      if (!unitObjectiveCodes.has(code)) {
        collected.set(code, {
          id: this.findCatalogObjective(objective.code)?.id ?? `transversal-catalog-${code}`,
          sourceObjectiveId: this.findCatalogObjective(objective.code)?.id ?? null,
          codigo: objective.code.replace(/\s+/g, ''),
          descripcion: objective.description,
          eje: objective.axis || 'Lectura',
          evaluationIndicators: objective.subItems ?? [],
          skills: this.findCatalogObjective(objective.code)?.skills ?? [],
          attitudes: this.findCatalogObjective(objective.code)?.attitudes ?? []
        });
      }
    }

    return Array.from(collected.values()).sort((left, right) => left.codigo.localeCompare(right.codigo, 'es'));
  }

  private initializeStep4State(): void {
    if (!this.classDate()) {
      this.classDate.set(this.resolveDefaultClassDate());
    }

    if (!this.classTitle()) {
      const unitName = this.selectedUnidad()?.nombre ?? 'Nueva clase';
      this.classTitle.set(`Clase de ${unitName}`);
    }

    if (!this.classDurationMinutes() || this.classDurationMinutes() <= 0) {
      this.classDurationMinutes.set(90);
    }

    for (const objective of this.selectedObjectives()) {
      this.ensureObjectiveIndicatorsForSelection(objective.id);
    }
  }

  private applyPreferredPlanningUnitDefaults(): void {
    const planningUnitId = this.preferredPlanningUnitId();
    if (planningUnitId == null) {
      this.isLoading.set(false);
      return;
    }

    this.planningApiService.getUnitById(planningUnitId).subscribe({
      next: (unit) => {
        const selectedUnit = this.resolveUnitForEditing(unit.unitNumberLabel, unit.name, planningUnitId);
        if (selectedUnit) {
          this.selectedUnidad.set(selectedUnit);
          this.selectedObjectiveTabKey.set(`unit-${selectedUnit.numero}`);
        }

        if (!this.classDate()) {
          this.classDate.set(unit.startDate || this.resolveDefaultClassDate());
        }

        this.isLoading.set(false);
      },
      error: () => {
        if (!this.classDate()) {
          this.classDate.set(this.resolveDefaultClassDate());
        }
        this.isLoading.set(false);
      }
    });
  }

  private hydrateEditingClass(): void {
    const classId = this.editingClassId();
    if (classId == null) {
      this.isLoading.set(false);
      return;
    }

    if (this.hydratedClassId() === classId) {
      this.isLoading.set(false);
      return;
    }

    this.planningApiService.getClassById(classId).subscribe({
      next: (planningClass) => {
        const planningUnitId = this.preferredPlanningUnitId() ?? planningClass.unitId ?? null;
        const applyHydratedClass = (unitNumberLabel: string, unitName: string, preferredUnitId: number | null): void => {
          const selectedUnit = this.resolveUnitForEditing(unitNumberLabel, unitName, preferredUnitId);
          if (selectedUnit) {
            this.selectedUnidad.set(selectedUnit);
            this.selectedObjectiveTabKey.set(`unit-${selectedUnit.numero}`);
          }

          if (preferredUnitId != null) {
            this.preferredPlanningUnitId.set(preferredUnitId);
          }

          this.selectedObjectiveIds.set(this.resolveSelectedObjectiveIdsForClass(planningClass));
          this.objectiveIndicators.set(this.resolveObjectiveIndicatorsForClass(planningClass));
          this.classTitle.set(planningClass.title);
          this.classDate.set(planningClass.plannedDate);
          this.classDurationMinutes.set(
            this.estimateDurationOptionMinutes(planningClass.durationCode, planningClass.durationLabel)
          );
          this.startActivity.set(planningClass.startActivity);
          this.developmentActivity.set(planningClass.developmentActivity);
          this.closingActivity.set(planningClass.closingActivity);
          this.selectedEvaluationType.set(this.mapEvaluationTypeLabel(planningClass.evaluationType));
          this.initializeStep4State();
          this.activeStep.set(4);
          this.hydratedClassId.set(classId);
          this.isLoading.set(false);
        };

        if (planningUnitId != null) {
          this.planningApiService.getUnitById(planningUnitId).subscribe({
            next: (unit) => applyHydratedClass(unit.unitNumberLabel, unit.name, planningUnitId),
            error: () => applyHydratedClass(planningClass.unitNumberLabel, planningClass.unitName, planningUnitId)
          });
          return;
        }

        applyHydratedClass(planningClass.unitNumberLabel, planningClass.unitName, planningUnitId);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la clase para editar.');
      }
    });
  }

  private buildSuggestedSkills(): string[] {
    const result = new Set<string>();

    for (const objective of this.selectedObjectives()) {
      for (const skill of objective.skills ?? []) {
        if (skill?.trim()) {
          result.add(skill.trim());
        }
      }
    }

    if (result.size) {
      return Array.from(result.values()).slice(0, 4);
    }

    const axes = this.selectedClassAxes().map((axis) => this.normalizeCompare(axis));

    if (axes.some((axis) => axis.includes('lectura'))) {
      result.add('Comprension lectora');
      result.add('Analisis');
    }
    if (axes.some((axis) => axis.includes('escrit'))) {
      result.add('Escritura guiada');
      result.add('Produccion de textos');
    }
    if (axes.some((axis) => axis.includes('oral'))) {
      result.add('Comunicacion oral');
      result.add('Argumentacion');
    }
    if (!result.size) {
      result.add('Observación');
      result.add('Participacion');
    }

    return Array.from(result.values()).slice(0, 4);
  }

  private resolveUnitForEditing(unitNumberLabel: string, unitName: string, planningUnitId?: number | null): UnidadClase | null {
    const units = this.unidadesDisponibles();
    if (!units.length) {
      return null;
    }

    if (planningUnitId != null) {
      const exactSelectedUnit = units.find((unit) => unit.id === planningUnitId);
      if (exactSelectedUnit) {
        return exactSelectedUnit;
      }
    }

    const filteredCatalogUnits = (this.classCatalogs()?.units ?? []).filter((unit) => this.matchesSelectedCatalogContext(unit));
    const exactPlanningUnit = planningUnitId != null
      ? filteredCatalogUnits.find((unit) => unit.unitId === planningUnitId) ?? null
      : null;
    const exactPlanningUnitNumber = this.extractFirstNumber(exactPlanningUnit?.unitNumberLabel ?? '');
    const exactPlanningUnitName = this.normalizeCompare(exactPlanningUnit?.unitName ?? '');
    const targetNumber = this.extractFirstNumber(unitNumberLabel);
    const normalizedName = this.normalizeCompare(unitName);

    if (exactPlanningUnit) {
      return units.find((unit) =>
        unit.id === exactPlanningUnit.unitId
        && unit.numero === exactPlanningUnitNumber
        && this.normalizeCompare(unit.nombre) === exactPlanningUnitName
      )
        ?? units.find((unit) => unit.id === exactPlanningUnit.unitId)
        ?? units.find((unit) =>
        unit.numero === exactPlanningUnitNumber
        && this.normalizeCompare(unit.nombre) === exactPlanningUnitName
      )
        ?? units.find((unit) => unit.numero === exactPlanningUnitNumber)
        ?? units.find((unit) => this.normalizeCompare(unit.nombre) === exactPlanningUnitName)
        ?? null;
    }

    return units.find((unit) => unit.numero === targetNumber)
      ?? units.find((unit) => this.normalizeCompare(unit.nombre) === normalizedName)
      ?? units[0]
      ?? null;
  }

  private resolveSelectedObjectiveIdsForClass(planningClass: {
    objectiveIds: string[];
    objectiveCode: string;
    objectiveSelections?: Array<{ objectiveId: string | null; objectiveCode: string; }>;
    curriculumObjectives: Array<{ codigo: string; }>;
  }): string[] {
    const availableObjectives = this.objectiveTabs().flatMap((tab) => tab.objectives);
    const availableById = new Set(availableObjectives.map((objective) => objective.id));

    const directMatches = (planningClass.objectiveIds ?? []).filter((id) => availableById.has(id));
    if (directMatches.length) {
      return directMatches;
    }

    const availableByCode = new Map(
      availableObjectives.map((objective) => [this.normalizeCompare(objective.codigo), objective.id] as const)
    );

    const selectionMatches = (planningClass.objectiveSelections ?? [])
      .map((selection) =>
        selection.objectiveId && availableById.has(selection.objectiveId)
          ? selection.objectiveId
          : availableByCode.get(this.normalizeCompare(selection.objectiveCode))
      )
      .filter((value): value is string => !!value);

    if (selectionMatches.length) {
      return Array.from(new Set(selectionMatches));
    }

    const curriculumMatches = (planningClass.curriculumObjectives ?? [])
      .map((objective) => availableByCode.get(this.normalizeCompare(objective.codigo)))
      .filter((value): value is string => !!value);

    if (curriculumMatches.length) {
      return Array.from(new Set(curriculumMatches));
    }

    const mainObjectiveId = availableByCode.get(this.normalizeCompare(planningClass.objectiveCode));
    return mainObjectiveId ? [mainObjectiveId] : [];
  }

  private buildSuggestedAttitudes(): string[] {
    const result = new Set<string>();

    for (const objective of this.selectedObjectives()) {
      for (const attitude of objective.attitudes ?? []) {
        if (attitude?.trim()) {
          result.add(attitude.trim());
        }
      }
    }

    if (result.size) {
      return Array.from(result.values()).slice(0, 4);
    }

    for (const attitude of this.selectedProgramUnit()?.attitudes ?? []) {
      if (attitude?.description?.trim()) {
        result.add(attitude.description.trim());
      }
    }

    for (const attitude of this.selectedProgram()?.globalAttitudes ?? []) {
      if (attitude?.description?.trim()) {
        result.add(attitude.description.trim());
      }
    }

    if (result.size) {
      return Array.from(result.values()).slice(0, 4);
    }

    result.add('Escuchar y respetar las ideas de otros.');
    result.add('Participar activamente en la clase.');

    if (this.selectedClassAxes().some((axis) => this.normalizeCompare(axis).includes('escrit'))) {
      result.add('Cuidar la presentacion y claridad del trabajo.');
    }

    if (this.selectedClassAxes().some((axis) => this.normalizeCompare(axis).includes('oral'))) {
      result.add('Expresarse con seguridad y respeto.');
    }

    return Array.from(result.values()).slice(0, 4);
  }

  private buildSuggestionPayload(): PlanningClassSuggestionPayload | null {
    const subjectName = this.subjectLabel();
    const courseName = this.courseLabel();
    const selectedUnit = this.selectedUnidad();
    const mainObjective = this.selectedObjectives()[0] ?? null;

    if (!subjectName || !courseName || !selectedUnit || !mainObjective) {
      return null;
    }

    const allSelectedObjectives = this.selectedObjectives();
    const relatedObjectives = allSelectedObjectives
      .slice(1)
      .map((objective) => `${objective.codigo}: ${objective.descripcion}`);
    const transversalObjectives = allSelectedObjectives
      .filter((objective) => !this.isObjectiveFromUnit(objective))
      .map((objective) => `${objective.codigo}: ${objective.descripcion}`);
    const evaluationIndicators = this.objectiveIndicatorValue(mainObjective.id);
    const secondaryObjectives = allSelectedObjectives.slice(1);
    const selectedObjectives = secondaryObjectives.map(
      (objective) => `${objective.codigo}: ${objective.descripcion}`
    );
    const selectedObjectiveIndicators = secondaryObjectives.flatMap((objective) =>
      this.objectiveIndicatorValue(objective.id).map((indicator) => `${objective.codigo}: ${indicator}`)
    );

    const subItems = [
      ...this.findObjectiveSubItems(mainObjective.codigo),
      ...relatedObjectives.map((item) => `OA relacionado: ${item}`)
    ];

    return {
      subjectName,
      courseName,
      unitName: selectedUnit.nombre,
      unitType: 'unidad',
      durationMinutes: this.classDurationMinutes(),
      objectiveCode: mainObjective.codigo,
      objectiveDescription: mainObjective.descripcion,
      objectiveType: 'habilidad',
      objectiveAxis: mainObjective.eje || 'Lectura',
      subItems,
      transversalObjectives,
      evaluationIndicators,
      selectedObjectives,
      selectedObjectiveIndicators
    };
  }

  private buildClassPayload(): PlanningClassPayload | null {
    const planningUnit = this.matchedPlanningUnit();
    if (!planningUnit) {
      this.snackBar.open(
        'La unidad seleccionada aún no existe como unidad creada en Planificaciones. Primero crea o guarda la unidad y luego agrega la clase.',
        'Cerrar',
        { duration: 4200 }
      );
      return null;
    }

    const title = this.classTitle().trim();
    const plannedDate = this.classDate().trim();
    const startActivity = this.startActivity().trim();
    const developmentActivity = this.developmentActivity().trim();
    const closingActivity = this.closingActivity().trim();
    const mainObjective = this.selectedObjectives()[0] ?? null;
    const durationCode = this.resolveDurationCode();
    const evaluationType = this.mapEvaluationTypeCode(this.selectedEvaluationType());

    if (!title || !plannedDate || !startActivity || !developmentActivity || !closingActivity) {
      this.snackBar.open(
        'Completa titulo, fecha, inicio, desarrollo y cierre antes de guardar la clase.',
        'Cerrar',
        { duration: 3600 }
      );
      return null;
    }

    if (!mainObjective && this.selectedProgram()) {
      this.snackBar.open('Debes seleccionar al menos un OA para guardar la clase.', 'Cerrar', {
        duration: 3600
      });
      return null;
    }

    const objectiveSelections = this.buildObjectiveSelectionsPayload();
    if (this.selectedObjectives().some((objective) =>
      objective.evaluationIndicators.length > 0 && !this.objectiveIndicatorValue(objective.id).length
    )) {
      this.snackBar.open('Selecciona al menos un indicador para cada OA elegido.', 'Cerrar', {
        duration: 3600
      });
      return null;
    }

    return {
      unitId: planningUnit.unitId,
      durationCode,
      plannedDate,
      title,
      objectiveCode: mainObjective?.codigo ?? 'CLASE_LIBRE',
      evaluationType,
      objectiveDescription: mainObjective?.descripcion ?? title,
      startActivity,
      developmentActivity,
      closingActivity,
      objectiveIds: this.selectedObjectives().length ? this.extractSelectedObjectiveUuids() : undefined,
      objectiveSelections: objectiveSelections.length ? objectiveSelections : undefined
    };
  }

  private findObjectiveSubItems(objectiveCode: string): string[] {
    const normalizedTarget = this.normalizeCompare(objectiveCode).replace(/\s+/g, '');
    const fromUnit = this.selectedProgramUnit()?.objectives.find(
      (objective) => this.normalizeCompare(objective.code).replace(/\s+/g, '') === normalizedTarget
    );

    if (fromUnit?.subItems?.length) {
      return fromUnit.subItems;
    }

    const fromCatalog = this.selectedProgram()?.objectiveCatalog.find(
      (objective) => this.normalizeCompare(objective.code).replace(/\s+/g, '') === normalizedTarget
    );

    return fromCatalog?.subItems ?? [];
  }

  private resolveSuggestionProviderLabel(providerUsed: string, statusMessage = ''): string {
    const rawProvider = (providerUsed ?? '').trim().replace(/^['"]|['"]$/g, '');
    const providerProbe = `${rawProvider} ${statusMessage ?? ''}`.toUpperCase();

    if (providerProbe.includes('OPENAI')) {
      const model = this.extractSuggestionProviderModel(rawProvider, 'OPENAI');
      return model ? `OpenAI (${model})` : 'OpenAI';
    }
    if (providerProbe.includes('DEEPSEEK')) {
      const model = this.extractSuggestionProviderModel(rawProvider, 'DEEPSEEK');
      return model ? `DeepSeek (${model})` : 'DeepSeek';
    }
    if (providerProbe.includes('GEMINI')) {
      const model = this.extractSuggestionProviderModel(rawProvider, 'GEMINI');
      return model ? `Gemini (${model})` : 'Gemini';
    }
    if (providerProbe.includes('LOCAL_FALLBACK')) {
      return 'respaldo interno';
    }
    return 'proveedor interno';
  }

  private extractSuggestionProviderModel(providerUsed: string, providerPrefix: 'OPENAI' | 'DEEPSEEK' | 'GEMINI'): string {
    const [prefix, ...modelParts] = providerUsed.split(':');
    if (prefix?.trim().toUpperCase() !== providerPrefix) {
      return '';
    }
    return modelParts.join(':').trim();
  }

  private extractSelectedObjectiveUuids(): string[] | undefined {
    const selectedUuids = this.selectedObjectives()
      .map((objective) => objective.sourceObjectiveId ?? objective.id)
      .filter((value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    );

    return selectedUuids.length ? Array.from(new Set(selectedUuids)) : undefined;
  }

  private validateObjectiveIndicators(): boolean {
    const missingObjectives = this.selectedObjectives().filter((objective) =>
      objective.evaluationIndicators.length > 0 && !this.objectiveIndicatorValue(objective.id).length
    );

    if (!missingObjectives.length) {
      return true;
    }

    this.step3ValidationMessage.set(
      `Debes seleccionar al menos un indicador para ${missingObjectives.length === 1 ? 'el OA' : 'cada OA'} seleccionado.`
    );
    return false;
  }

  private ensureObjectiveIndicatorsForSelection(objectiveId: string): void {
    const objective = this.findObjectiveById(objectiveId);
    if (!objective?.evaluationIndicators.length || this.objectiveIndicatorValue(objectiveId).length) {
      return;
    }

    this.objectiveIndicators.update((current) => ({
      ...current,
      [objectiveId]: [objective.evaluationIndicators[0]]
    }));
  }

  private expandObjectiveAccordion(objectiveId: string): void {
    this.expandedObjectiveIds.update((current) =>
      current.includes(objectiveId) ? current : [...current, objectiveId]
    );
  }

  private findObjectiveById(objectiveId: string): ObjetivoClase | null {
    if (this.isInitialEducationFlow()) {
      return this.selectedObjectives().find((objective) => objective.id === objectiveId)
        ?? this.mapInitialEducationObjectiveById(objectiveId);
    }

    return this.objectiveTabs()
      .flatMap((tab) => tab.objectives)
      .find((objective) => objective.id === objectiveId) ?? null;
  }

  private mapInitialEducationObjectiveById(objectiveId: string): ObjetivoClase | null {
    const objective = this.initialEducationObjectiveOptions().find((item) => item.id === objectiveId);
    if (!objective) {
      return null;
    }

    return {
      id: objective.id,
      sourceObjectiveId: null,
      codigo: objective.codigo,
      descripcion: objective.descripcion,
      eje: objective.eje || 'Artes',
      evaluationIndicators: objective.indicadores,
      skills: [],
      attitudes: []
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
    const subjectKey = this.normalizeCompare(curriculum.visibleSubject).replace(/\s+/g, '-').toLowerCase();

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
  private buildInitialEducationActivitySuggestions(
    objectives: ObjetivoClase[]
  ): InitialEducationActivitySuggestion[] {
    const objectivesByCode = new Map(
      this.initialEducationObjectiveOptions().map((objective) => [this.normalizeCompare(objective.codigo), objective] as const)
    );
    const suggestions: InitialEducationActivitySuggestion[] = [];

    objectives.forEach((objective) => {
      const source = objectivesByCode.get(this.normalizeCompare(objective.codigo));
      (source?.activities ?? []).forEach((activity, index) => {
        suggestions.push({
          id: `${objective.id}-activity-${activity.number ?? index + 1}`,
          title: `${objective.codigo} · Actividad sugerida ${activity.number ?? index + 1}`,
          objectiveCodes: [objective.codigo],
          summary: activity.description,
          materials: [],
          highlightedIndicators: this.objectiveIndicatorValue(objective.id),
          startActivity: `Presenta el objetivo ${objective.codigo} y activa conocimientos previos vinculados a ${source?.eje ?? 'la experiencia'}.`,
          developmentActivity: activity.description,
          closingActivity: `Cierra la experiencia retomando el ${objective.codigo} y comentando con el curso lo observado durante la actividad.`
        });
      });
    });

    if (!suggestions.length) {
      return objectives.map((objective) => ({
        id: `${objective.id}-activity-fallback`,
        title: `${objective.codigo} · Actividad sugerida`,
        objectiveCodes: [objective.codigo],
        summary: objective.descripcion,
        materials: [],
        highlightedIndicators: this.objectiveIndicatorValue(objective.id),
        startActivity: `Invita al curso a conversar brevemente sobre ${objective.codigo}.`,
        developmentActivity: objective.descripcion,
        closingActivity: `Finaliza retomando los aprendizajes esperados del ${objective.codigo}.`
      }));
    }

    return suggestions;
  }

  private isObjectiveFromUnit(objective: ObjetivoClase): boolean {
    const selectedUnitCodes = new Set(
      this.objectiveOptions().map((item) => item.codigo.trim().toUpperCase())
    );
    return selectedUnitCodes.has(objective.codigo.trim().toUpperCase());
  }

  private findCatalogObjective(objectiveCode: string): PlanningObjectiveOption | null {
    const normalizedCode = this.normalizeCompare(objectiveCode).replace(/\s+/g, '');
    const unitId = this.matchedPlanningUnit()?.unitId ?? null;
    const catalogObjectives = this.classCatalogs()?.objectives ?? [];

    return catalogObjectives.find((objective) =>
      objective.id
      && objective.unitId === unitId
      && this.normalizeCompare(objective.code).replace(/\s+/g, '') === normalizedCode
    )
      ?? catalogObjectives.find((objective) =>
        objective.id
        && this.normalizeCompare(objective.code).replace(/\s+/g, '') === normalizedCode
      )
      ?? null;
  }

  private buildObjectiveSelectionsPayload(): PlanningClassObjectiveSelection[] {
    return this.selectedObjectives().map((objective) => ({
      objectiveId: objective.sourceObjectiveId,
      objectiveCode: objective.codigo,
      indicators: this.objectiveIndicatorValue(objective.id)
    }));
  }

  private resolveObjectiveIndicatorsForClass(planningClass: {
    objectiveSelections?: Array<{ objectiveId: string | null; objectiveCode: string; indicators: string[]; }>;
  }): Record<string, string[]> {
    const availableObjectives = this.objectiveTabs().flatMap((tab) => tab.objectives);
    const availableById = new Map(availableObjectives.map((objective) => [objective.id, objective] as const));
    const availableByCode = new Map(
      availableObjectives.map((objective) => [this.normalizeCompare(objective.codigo), objective] as const)
    );

    return (planningClass.objectiveSelections ?? []).reduce<Record<string, string[]>>((acc, selection) => {
      const matchedObjective = (selection.objectiveId ? availableById.get(selection.objectiveId) : null)
        ?? availableByCode.get(this.normalizeCompare(selection.objectiveCode));
      if (!matchedObjective) {
        return acc;
      }

      acc[matchedObjective.id] = Array.from(new Set((selection.indicators ?? []).filter((item) => !!item?.trim())));
      return acc;
    }, {});
  }

  private resolveDurationCode(): string {
    const options = this.classCatalogs()?.durationOptions ?? [];
    if (!options.length) {
      return 'UN_BLOQUE';
    }

    const selectedMinutes = this.classDurationMinutes();
    const ranked = options
      .map((option) => ({
        code: option.code,
        distance: Math.abs(this.estimateDurationOptionMinutes(option.code, option.label) - selectedMinutes)
      }))
      .sort((left, right) => left.distance - right.distance);

    return ranked[0]?.code ?? options[0].code;
  }

  private estimateDurationOptionMinutes(code: string, label: string): number {
    const normalizedLabel = this.normalizeCompare(label);
    const normalizedCode = this.normalizeCompare(code);
    const explicitMinutes = label.match(/(\d{2,3})\s*min/i)?.[1];
    if (explicitMinutes) {
      return Number(explicitMinutes);
    }

    const explicitBlocks = label.match(/(\d+)\s*bloq/i)?.[1] ?? code.match(/(\d+)\s*bloq/i)?.[1];
    if (explicitBlocks) {
      return Number(explicitBlocks) * 45;
    }

    if (normalizedCode.includes('dos') || normalizedCode.includes('2') || normalizedLabel.includes('dos')) {
      return 90;
    }
    if (normalizedCode.includes('tres') || normalizedCode.includes('3') || normalizedLabel.includes('tres')) {
      return 135;
    }
    if (normalizedCode.includes('cuatro') || normalizedCode.includes('4') || normalizedLabel.includes('cuatro')) {
      return 180;
    }

    return 45;
  }

  private resolveDefaultClassDate(): string {
    const year = this.year() || '2026';
    return this.firstBusinessDayOfMonth(Number(year), this.semester() === '2' ? 7 : 3);
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

  private resolvePlanningClassUnit(): PlanningClassCatalogUnit | null {
    const selectedUnit = this.selectedUnidad();
    if (!selectedUnit) {
      return null;
    }

    const catalogs = this.classCatalogs()?.units ?? [];
    const filtered = catalogs.filter((unit) => this.matchesSelectedCatalogContext(unit));

    if (!filtered.length) {
      return null;
    }

    const preferredPlanningUnitId = this.preferredPlanningUnitId();
    if (preferredPlanningUnitId != null) {
      const exactPlanningUnit = filtered.find((unit) => unit.unitId === preferredPlanningUnitId);
      if (exactPlanningUnit) {
        return exactPlanningUnit;
      }
    }

    const normalizedSelectedName = this.normalizeCompare(selectedUnit.nombre);
    const byName = filtered.find((unit) => this.normalizeCompare(unit.unitName) === normalizedSelectedName);
    if (byName) {
      return byName;
    }

    const byIncludedName = filtered.find((unit) => {
      const unitName = this.normalizeCompare(unit.unitName);
      return unitName.includes(normalizedSelectedName) || normalizedSelectedName.includes(unitName);
    });
    if (byIncludedName) {
      return byIncludedName;
    }

    const byNumber = filtered.find(
      (unit) => this.extractFirstNumber(unit.unitNumberLabel) === selectedUnit.numero
    );
    if (byNumber) {
      return byNumber;
    }

    return filtered[0] ?? null;
  }

  private matchesSelectedCatalogContext(unit: PlanningClassCatalogUnit): boolean {
    const selectedSubjectId = Number(this.subject());
    const selectedCourseId = Number(this.course());
    const selectedYear = Number(this.year());
    const selectedSemester = Number(this.semester());
    const selectedSubjectName = this.findLabel(this.subjects(), this.subject());
    const selectedCourse = this.selectedCourseModel();
    const normalizedSelectedSubject = this.normalizeCompare(selectedSubjectName);
    const normalizedSelectedCourse = this.normalizeCompare(selectedCourse?.name ?? this.courseLabel());
    const normalizedUnitSubject = this.normalizeCompare(unit.subjectName);
    const normalizedUnitCourse = this.normalizeCompare(unit.courseName);

    const matchesSubject = Number.isFinite(selectedSubjectId)
      ? unit.subjectId === selectedSubjectId || normalizedUnitSubject === normalizedSelectedSubject
      : normalizedUnitSubject === normalizedSelectedSubject;

    const matchesCourse = Number.isFinite(selectedCourseId)
      ? unit.courseId === selectedCourseId || normalizedUnitCourse === normalizedSelectedCourse
      : normalizedUnitCourse === normalizedSelectedCourse;

    const matchesYear = Number.isFinite(selectedYear)
      ? unit.schoolYear == null || unit.schoolYear === selectedYear
      : true;

    const matchesSemester = selectedSemester === 1 || selectedSemester === 2
      ? unit.semester == null || unit.semester === selectedSemester
      : true;

    return matchesSubject && matchesCourse && matchesYear && matchesSemester;
  }

  private mapEvaluationTypeCode(value: string): string {
    const normalized = this.normalizeCompare(value);
    if (normalized.includes('clase') || normalized.includes('sin evalu')) {
      return 'SIN_EVALUACION';
    }
    if (normalized.includes('sumativa')) {
      return 'SUMATIVA';
    }
    if (normalized.includes('proceso')) {
      return 'PROCESO';
    }
    if (normalized.includes('diagnost')) {
      return 'DIAGNOSTICA';
    }
    return 'FORMATIVA';
  }

  private mapEvaluationTypeLabel(value: string): string {
    const normalized = this.normalizeCompare(value);
    if (normalized.includes('sin_evaluacion') || normalized.includes('sin evalu') || normalized.includes('clase')) {
      return 'Clase';
    }
    if (normalized.includes('sumativa')) {
      return 'Sumativa';
    }
    if (normalized.includes('proceso')) {
      return 'Proceso';
    }
    if (normalized.includes('diagnost')) {
      return 'Diagnostica';
    }
    return 'Formativa';
  }

  private extractFirstNumber(value: string): number | null {
    const match = value.match(/\d+/);
    if (match) {
      return Number(match[0]);
    }

    const normalized = this.normalizeCompare(value)
      .replace(/_/g, ' ')
      .toUpperCase();
    const romanMatch = normalized.match(/\b([IVXLCDM]+)\b/);
    if (!romanMatch) {
      return null;
    }

    return this.romanToNumber(romanMatch[1]);
  }

  private romanToNumber(value: string): number | null {
    const roman = value.trim().toUpperCase();
    if (!roman) {
      return null;
    }

    const values: Record<string, number> = {
      I: 1,
      V: 5,
      X: 10,
      L: 50,
      C: 100,
      D: 500,
      M: 1000
    };

    let total = 0;
    let previous = 0;

    for (let index = roman.length - 1; index >= 0; index -= 1) {
      const current = values[roman[index]];
      if (!current) {
        return null;
      }

      if (current < previous) {
        total -= current;
      } else {
        total += current;
        previous = current;
      }
    }

    return total || null;
  }

  private normalizeCompare(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}

