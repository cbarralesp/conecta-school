import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  AddOaOtherUnitModalComponent,
  OtherUnitObjectiveOption,
  OtherUnitOption
} from '../components/add-oa-other-unit-modal.component';
import {
  PlanningUnitCatalogAssignment,
  PlanningUnitPayload
} from '../../../core/models/planning.models';
import {
  StudyProgramDetail,
  StudyProgramObjectiveDetail,
  StudyProgramSummary,
  StudyProgramUnit
} from '../../../core/models/study-program.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { ScheduleApiService } from '../../../core/services/schedule-api.service';
import { StudyProgramApiService } from '../../../core/services/study-program-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type SelectOption = {
  value: string;
  label: string;
};

type ColorOption = {
  value: string;
  label: string;
};

type StepItem = {
  number: number;
  label: string;
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
    AddOaOtherUnitModalComponent
  ],
  templateUrl: './plannings-unit-create-page.component.html',
  styleUrl: './plannings-unit-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningsUnitCreatePageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly planningApiService = inject(PlanningApiService);
  private readonly studyProgramApiService = inject(StudyProgramApiService);
  private readonly scheduleApiService = inject(ScheduleApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;

  readonly steps: StepItem[] = [
    { number: 1, label: 'Curso y asignatura' },
    { number: 2, label: 'Unidad del programa' },
    { number: 3, label: 'Fechas y clases' },
    { number: 4, label: 'Objetivos OA' },
    { number: 5, label: 'Revision' }
  ];

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
  readonly isSaving = signal(false);
  readonly assignments = signal<PlanningUnitCatalogAssignment[]>([]);
  readonly availablePrograms = signal<StudyProgramSummary[]>([]);
  readonly selectedProgram = signal<StudyProgramDetail | null>(null);
  readonly unidadesFiltradas = signal<UnidadPrograma[]>([]);
  readonly selectedUnidad = signal<UnidadPrograma | null>(null);
  readonly appliedUnidad = signal<UnidadPrograma | null>(null);
  readonly addedOtherUnitOas = signal<OtherUnitObjectiveOption[]>([]);
  readonly editingUnitId = signal<number | null>(null);
  readonly hydratedUnitId = signal<number | null>(null);
  readonly year = signal('');
  readonly course = signal('');
  readonly subject = signal('');
  readonly semester = signal('1');
  readonly selectedColor = signal('#6d28d9');
  readonly colorManuallySelected = signal(false);
  readonly existingUnitsCount = signal(0);
  readonly validationMessage = signal('');
  readonly step3ValidationMessage = signal('');
  readonly reviewValidationMessage = signal('');
  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly selectedClassDays = signal<string[]>(['Lunes', 'Miercoles', 'Viernes']);
  readonly manualClassAdjustment = signal<number | null>(null);

  readonly years = computed<SelectOption[]>(() => {
    const values = Array.from(new Set(this.assignments().map((item) => item.schoolYear))).sort((a, b) => b - a);
    return values.map((value) => ({ value: String(value), label: String(value) }));
  });

  readonly courses = computed<SelectOption[]>(() => {
    const selectedYear = this.year();
    const unique = new Map<string, string>();

    for (const assignment of this.assignments()) {
      if (selectedYear && String(assignment.schoolYear) !== selectedYear) {
        continue;
      }
      if (!unique.has(String(assignment.courseId))) {
        unique.set(String(assignment.courseId), assignment.courseName);
      }
    }

    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  });

  readonly subjects = computed<SelectOption[]>(() => {
    const selectedYear = this.year();
    const selectedCourse = this.course();
    const unique = new Map<string, string>();

    for (const assignment of this.assignments()) {
      if (selectedYear && String(assignment.schoolYear) !== selectedYear) {
        continue;
      }
      if (selectedCourse && String(assignment.courseId) !== selectedCourse) {
        continue;
      }
      if (!unique.has(String(assignment.subjectId))) {
        unique.set(String(assignment.subjectId), assignment.subjectName);
      }
    }

    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  });

  readonly yearLabel = computed(() => this.findLabel(this.years(), this.year()));
  readonly courseLabel = computed(() => this.findLabel(this.courses(), this.course()));
  readonly subjectLabel = computed(() => this.findLabel(this.subjects(), this.subject()));
  readonly semesterLabel = computed(() => this.semester() === '2' ? 'Segundo semestre' : 'Primer semestre');
  readonly appliedUnitTitle = computed(() => this.appliedUnidad()?.nombre || 'Unidad sin seleccionar');
  readonly appliedUnitNumber = computed(() => this.appliedUnidad()?.numero ?? 0);
  readonly calculatedWeeks = computed(() => this.calculateWeeks(this.startDate(), this.endDate()));
  readonly classesPerWeek = computed(() => this.selectedClassDays().length);
  readonly totalCalculatedClasses = computed(() => this.calculatedWeeks() * this.classesPerWeek());
  readonly finalEstimatedClasses = computed(() => {
    const manual = this.manualClassAdjustment();
    return manual && manual > 0 ? manual : this.totalCalculatedClasses();
  });
  readonly previewPeriod = computed(() => this.formatPeriodPreview(this.startDate(), this.endDate()));
  readonly selectedObjectives = computed<ObjetivoAprendizaje[]>(() => {
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
  readonly programReference = computed(() => {
    const program = this.selectedProgram();
    if (!program) {
      return 'No se encontro un programa oficial disponible para la seleccion actual.';
    }
    return `Esta planificacion se basa en el Programa de Estudio ${program.grade}, ${program.decree}, ${program.edition}.`;
  });
  readonly reviewProgramLabel = computed(() => {
    const program = this.selectedProgram();
    if (!program) {
      return 'Programa oficial sin referencia';
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

  readonly metricCards = computed<PreviewMetric[]>(() => {
    const program = this.selectedProgram();
    return [
      {
        label: 'Unidades disponibles',
        value: program?.totalUnits ?? 0,
        icon: 'menu_book',
        tone: 'violet'
      },
      {
        label: 'OA disponibles',
        value: program?.totalObjectives ?? 0,
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
  readonly selectedOtherUnitOaIds = computed(() => this.addedOtherUnitOas().map((item) => item.id));

  constructor() {
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
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updateCourse(value: string): void {
    this.course.set(value);
    this.syncSubjectSelection();
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updateSubject(value: string): void {
    this.subject.set(value);
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  updateSemester(value: string): void {
    this.semester.set(value);
    this.colorManuallySelected.set(false);
    this.loadProgramForSelection();
    this.loadExistingUnitsForColorSuggestion();
  }

  continue(): void {
    if (!this.year() || !this.course() || !this.subject() || !this.semester()) {
      this.validationMessage.set('Debes completar año, curso, asignatura y semestre para continuar.');
      return;
    }

    if (!this.selectedProgram()) {
      this.validationMessage.set('No se encontro un programa oficial asociado a la seleccion actual.');
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

  canNavigateToStep(step: number): boolean {
    if (step === this.activeStep()) {
      return true;
    }

    switch (step) {
      case 1:
        return true;
      case 2:
        return this.hasStep1Data();
      case 3:
        return !!this.appliedUnidad();
      case 4:
        return !!this.appliedUnidad() && this.validateStep3();
      case 5:
        return this.selectedObjectives().length > 0;
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
      this.activeStep.set(1);
      return;
    }

    if (step === 2) {
      this.closeOtherUnitOaModal();
      this.openUnitModal();
      return;
    }

    if (step === 3) {
      this.closeUnitModal();
      this.closeOtherUnitOaModal();
      this.activeStep.set(3);
      return;
    }

    if (step === 4) {
      this.closeUnitModal();
      this.activeStep.set(4);
      this.openOtherUnitOaModal();
      return;
    }

    if (step === 5) {
      this.closeUnitModal();
      this.closeOtherUnitOaModal();
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

  applyOtherUnitOas(objectives: OtherUnitObjectiveOption[]): void {
    this.addedOtherUnitOas.set(objectives);
    this.isOtherUnitOaModalOpen.set(false);
    this.reviewValidationMessage.set('');
    this.activeStep.set(5);
    this.snackBar.open(`${objectives.length} OA agregados desde otras unidades.`, 'Cerrar', {
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
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');
  }

  updateEndDate(value: string): void {
    this.endDate.set(value);
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
    this.activeStep.set(4);
    this.openOtherUnitOaModal();
  }

  goBackToStep4(): void {
    this.reviewValidationMessage.set('');
    this.activeStep.set(4);
    this.openOtherUnitOaModal();
  }

  guardarUnidad(): void {
    if (!this.isReadyToSave()) {
      this.reviewValidationMessage.set('Faltan datos para guardar la unidad.');
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
        this.snackBar.open(editingUnitId != null ? 'La unidad fue actualizada correctamente.' : 'La unidad fue guardada correctamente.', 'Cerrar', {
          duration: 3200
        });
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
          : 'No fue posible guardar la unidad.';
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
      && this.selectedObjectives().length > 0
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
      return this.activeStep() > 2 && !!this.appliedUnidad();
    }
    if (stepNumber === 3) {
      return this.activeStep() > 3 && this.validateStep3();
    }
    if (stepNumber === 4) {
      return this.activeStep() > 4 && this.selectedObjectives().length > 0;
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
        this.loadProgramForSelection();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los cursos y asignaturas');
      }
    });
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
    this.semester.set(semesterParam === '2' ? '2' : '1');
    this.editingUnitId.set(unitIdParam ? Number(unitIdParam) : null);
    this.loadExistingUnitsForColorSuggestion();
  }

  private syncCourseSelection(preferredValue?: string): void {
    const options = this.courses();
    const current = preferredValue ?? this.course();
    const exists = options.some((item) => item.value === current);
    this.course.set(exists ? current : (options[0]?.value ?? ''));
  }

  private syncSubjectSelection(preferredValue?: string): void {
    const options = this.subjects();
    const current = preferredValue ?? this.subject();
    const exists = options.some((item) => item.value === current);
    this.subject.set(exists ? current : (options[0]?.value ?? ''));
  }

  private loadProgramForSelection(): void {
    const subjectName = this.subjectLabel();
    const grade = this.extractGradeFromCourse(this.courseLabel());

    if (!subjectName || !grade) {
      this.availablePrograms.set([]);
      this.selectedProgram.set(null);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.studyProgramApiService.findPrograms({ subjectName, grade }).subscribe({
      next: (programs) => {
        this.availablePrograms.set(programs);
        const selected = programs[0] ?? null;
        if (!selected) {
          this.selectedProgram.set(null);
          this.isLoading.set(false);
          return;
        }

        this.studyProgramApiService.getProgram(selected.id).subscribe({
          next: (program) => {
            this.selectedProgram.set(program);
            this.cargarUnidadesDelPrograma();
            this.hydrateEditingUnit();
          },
          error: (error: HttpErrorResponse) => {
            this.selectedProgram.set(null);
            this.isLoading.set(false);
            this.showError(error, 'No fue posible cargar el detalle del programa');
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.availablePrograms.set([]);
        this.selectedProgram.set(null);
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
      this.applySuggestedColor();
      return;
    }

    this.planningApiService.getPlanningSummary({ year, courseId, subjectId, semester }).subscribe({
      next: (summary) => {
        const editingUnitId = this.editingUnitId();
        const count = summary.units.filter((unit) => unit.id !== editingUnitId).length;
        this.existingUnitsCount.set(count);
        this.applySuggestedColor();
      },
      error: () => {
        this.existingUnitsCount.set(0);
        this.applySuggestedColor();
      }
    });
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

  private findLabel(options: SelectOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? '';
  }

  private initializeStep3Form(): void {
    const { startDate, endDate } = this.resolveDefaultUnitDateRange();
    this.startDate.set(startDate);
    this.endDate.set(endDate);
    this.manualClassAdjustment.set(null);
    this.step3ValidationMessage.set('');
    this.reviewValidationMessage.set('');
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
                  .filter((entry) => entry.subjectId === subjectId && entry.blockType === 'CLASE')
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
        helperText: 'Estos objetivos pueden trabajarse de forma transversal durante el ano o quedaron fuera de esta planificacion. Puedes agregarlos manualmente a una unidad desde "Editar unidad".',
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
    return 'Periodo por definir';
  }

  private resolveDescription(unit: StudyProgramUnit): string {
    return unit.readingPurpose
      || unit.writingPurpose
      || unit.oralCommunicationPurpose
      || 'Sin descripcion disponible.';
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
    return !!this.year() && !!this.course() && !!this.subject() && !!this.semester() && !!this.selectedProgram();
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
    return this.selectedObjectives()
      .map((objective) => `${this.formatObjectiveLabel(objective)}: ${objective.descripcion}`)
      .join('\n');
  }

  private buildAchievementIndicatorsText(): string {
    const indicators = this.selectedObjectives()
      .flatMap((objective) => objective.evaluationIndicators?.length
        ? objective.evaluationIndicators
        : [objective.descripcion]);

    return Array.from(new Set(indicators)).join('\n');
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
      return 'Periodo por definir';
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Periodo por definir';
    }

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[start.getMonth()]} - ${months[end.getMonth()]} ${end.getFullYear()}`;
  }

  private resolveDefaultUnitDateRange(): { startDate: string; endDate: string } {
    const year = this.year() || '2026';

    if (this.semester() === '2') {
      return {
        startDate: this.firstBusinessDayOfMonth(Number(year), 8),
        endDate: `${year}-12-15`
      };
    }

    return {
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
