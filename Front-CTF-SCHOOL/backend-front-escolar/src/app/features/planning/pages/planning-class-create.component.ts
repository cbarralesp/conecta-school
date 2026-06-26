import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  PlanningClassCatalogs,
  PlanningClassCatalogUnit,
  PlanningClass,
  PlanningClassPayload,
  PlanningClassSuggestionPayload,
  PlanningObjectiveOption
} from '../../../core/models/planning.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import {
  CurriculumObjective
} from '../../../core/models/curriculum.models';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type ClassFormMode = 'draft' | 'publish';

type PendingDocument = {
  file: File;
  visibleToStudents: boolean;
};

type ChipGroupMode = 'single' | 'multiple';
@Component({
  selector: 'app-planning-class-create',
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './planning-class-create.component.html',
  styleUrl: './planning-class-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningClassCreateComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly planningApiService = inject(PlanningApiService);
  private readonly curriculumService = inject(CurriculumService);
  private readonly authStateService = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly editingClassId = signal<number | null>(this.resolveEditingClassId());
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly catalogs = signal<PlanningClassCatalogs | null>(null);
  readonly pendingDocuments = signal<PendingDocument[]>([]);
  readonly selectedSubjectId = signal<number | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly startStrategy = signal('Lluvia de ideas');
  readonly groupingMode = signal('Individual');
  readonly reflectionSuccess = signal('');
  readonly reflectionImprove = signal('');
  readonly objectiveAchievement = signal(75);
  readonly diversityNotes = signal('');
  readonly selectedLearningApproach = signal('Para el aprendizaje');
  readonly selectedInstrument = signal('Rubrica');
  readonly activeResources = signal<string[]>(['Guia impresa', 'Proyector']);
  readonly activeDiversitySupports = signal<string[]>(['PIE']);
  readonly curriculumObjectives = signal<CurriculumObjective[]>([]);
  readonly selectedCurriculumAxis = signal('all');
  readonly selectedCurriculumType = signal('all');
  readonly selectedCurriculumObjectives = signal<CurriculumObjective[]>([]);
  readonly selectedCurriculumObjectiveOptionId = signal('');
  readonly curriculumObjectiveIndicators = signal<Record<string, string>>({});
  readonly loadedCurriculumGradeCodes = signal<string[]>([]);
  readonly loadedCurriculumContextKey = signal('');
  readonly isCurriculumLoading = signal(false);
  readonly isGeneratingSuggestion = signal(false);
  readonly suggestionStatus = signal('Selecciona al menos un OA y genera una sugerencia guiada para completar la clase.');
  readonly lastAutoDiversityNote = signal('');

  readonly form = this.formBuilder.group({
    unitId: this.formBuilder.control<number | null>(null, Validators.required),
    durationCode: this.formBuilder.control('', Validators.required),
    plannedDate: this.formBuilder.control<Date | null>(null, Validators.required),
    title: this.formBuilder.control('', Validators.required),
    subjectId: this.formBuilder.control<number | null>(null),
    courseId: this.formBuilder.control<number | null>(null),
    objectiveCode: this.formBuilder.control(''),
    evaluationType: this.formBuilder.control(''),
    startActivity: this.formBuilder.control(''),
    developmentActivity: this.formBuilder.control(''),
    closingActivity: this.formBuilder.control('')
  });
  readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly isEditMode = computed(() => this.editingClassId() !== null);
  readonly pageTitle = computed(() => this.isEditMode() ? 'Editar Planificacion' : 'Nueva Planificacion');
  readonly saveButtonLabel = computed(() => this.isEditMode() ? 'Actualizar Planificacion' : 'Guardar Planificacion');
  readonly startStrategyOptions = [
    'Lluvia de ideas',
    'Imagen misteriosa',
    'Pregunta detonante',
    'Video corto'
  ] as const;
  readonly groupingOptions = [
    'Individual',
    'Parejas',
    'Grupos pequenos (4 alumnos)',
    'Grande (Puzzle)'
  ] as const;
  readonly learningApproachOptions = [
    'Para el aprendizaje',
    'Como el aprendizaje',
    'Del aprendizaje'
  ] as const;
  readonly instrumentOptions = [
    'Lista de cotejo',
    'Rubrica',
    'Pregunta oral',
    'Prueba escrita',
    'Autoevaluacion'
  ] as const;
  readonly resourceOptions = [
    'Guia impresa',
    'Proyector',
    'Libro de texto',
    'Material concreto',
    'Video'
  ] as const;
  readonly diversitySupportOptions = [
    'PIE',
    'Superdotacion',
    'Diferenciacion por nivel'
  ] as const;

  readonly subjectOptions = computed(() => {
    const subjects = new Map<number, { id: number; name: string }>();
    for (const unit of this.catalogs()?.units ?? []) {
      if (!subjects.has(unit.subjectId)) {
        subjects.set(unit.subjectId, { id: unit.subjectId, name: unit.subjectName });
      }
    }
    return Array.from(subjects.values()).sort((left, right) =>
      left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })
    );
  });

  readonly courseOptions = computed(() => {
    const subjectId = this.selectedSubjectId();
    const courses = new Map<number, { id: number; name: string }>();
    for (const unit of this.catalogs()?.units ?? []) {
      if (subjectId !== null && unit.subjectId !== subjectId) {
        continue;
      }
      if (!courses.has(unit.courseId)) {
        courses.set(unit.courseId, { id: unit.courseId, name: unit.courseName });
      }
    }
    return Array.from(courses.values()).sort((left, right) => this.compareCourseNames(left.name, right.name));
  });

  readonly filteredUnits = computed(() => {
    const subjectId = this.selectedSubjectId();
    const courseId = this.selectedCourseId();
    return (this.catalogs()?.units ?? []).filter(
      (unit) =>
        (subjectId === null || unit.subjectId === subjectId) &&
        (courseId === null || unit.courseId === courseId)
    );
  });

  readonly selectedUnit = computed<PlanningClassCatalogUnit | null>(() => {
    const unitId = this.formValue().unitId;
    if (!unitId) {
      return null;
    }
    return this.catalogs()?.units.find((unit) => unit.unitId === unitId) ?? null;
  });

  readonly objectiveOptions = computed<PlanningObjectiveOption[]>(() => {
    const unitId = this.formValue().unitId;
    if (!unitId) {
      return [];
    }
    return (this.catalogs()?.objectives ?? []).filter((objective) => objective.unitId === unitId);
  });

  readonly objectiveGroups = computed(() => {
    const groups = new Map<string, PlanningObjectiveOption[]>();
    for (const objective of this.objectiveOptions()) {
      const axis = objective.axis || 'Objetivos de Aprendizaje';
      groups.set(axis, [...(groups.get(axis) ?? []), objective]);
    }

    return Array.from(groups.entries()).map(([axis, objectives]) => ({
      axis,
      objectives
    }));
  });

  readonly selectedObjective = computed<PlanningObjectiveOption | null>(() => {
    const objectiveCode = this.formValue().objectiveCode;
    if (!objectiveCode) {
      return null;
    }
    return this.objectiveOptions().find((objective) => objective.code === objectiveCode) ?? null;
  });

  readonly previewCurriculumObjective = computed<CurriculumObjective | null>(() => {
    const selectedOptionId = this.selectedCurriculumObjectiveOptionId();
    const selectedOption =
      this.filteredCurriculumObjectives().find((objective) => objective.id === selectedOptionId) ??
      this.curriculumObjectives().find((objective) => objective.id === selectedOptionId);

    if (selectedOption) {
      return selectedOption;
    }

    return this.selectedCurriculumObjectives()[0] ?? null;
  });

  readonly displayedSkills = computed(() => {
    const previewObjective = this.previewCurriculumObjective();
    if (previewObjective) {
      return this.buildSuggestedSkills(previewObjective);
    }
    const skills = this.selectedObjective()?.skills ?? [];
    return skills.length > 0 ? skills : ['Crear', 'Analizar'];
  });

  readonly displayedAttitudes = computed(() => {
    const previewObjective = this.previewCurriculumObjective();
    if (previewObjective) {
      return this.buildSuggestedAttitudes(previewObjective);
    }
    const attitudes = this.selectedObjective()?.attitudes ?? [];
    return attitudes.length > 0
      ? attitudes
      : ['Respetar y valorar las obras de sus companeros.', 'Cuidar los materiales de trabajo.'];
  });

  readonly curriculumAxisOptions = computed(() => {
    const axes = new Set<string>();
    for (const objective of this.curriculumObjectives()) {
      if (objective.eje?.trim()) {
        axes.add(objective.eje.trim());
      }
    }
    return Array.from(axes.values()).sort((left, right) => left.localeCompare(right, 'es'));
  });

  readonly filteredCurriculumObjectives = computed(() => {
    const selectedAxis = this.selectedCurriculumAxis();
    const selectedType = this.selectedCurriculumType();

    return this.curriculumObjectives().filter((objective) => {
      const matchesAxis = selectedAxis === 'all' || objective.eje === selectedAxis;
      const matchesType = selectedType === 'all' || objective.tipo === selectedType;
      return matchesAxis && matchesType;
    });
  });

  readonly hasCurriculumContext = computed(() =>
    Boolean(this.resolvePlanningSubjectName() && this.resolvePlanningCourseName())
  );

  readonly curriculumObjectiveGroups = computed(() => {
    const groups = new Map<string, CurriculumObjective[]>();
    for (const objective of this.filteredCurriculumObjectives()) {
      const axis = objective.eje?.trim() || 'Objetivos de Aprendizaje';
      groups.set(axis, [...(groups.get(axis) ?? []), objective]);
    }

    return Array.from(groups.entries())
      .map(([axis, objectives]) => ({
        axis,
        objectives: [...objectives].sort((left, right) => this.compareObjectiveCodes(left.codigo, right.codigo))
      }))
      .sort((leftGroup, rightGroup) => {
        const leftFirstObjective = leftGroup.objectives[0];
        const rightFirstObjective = rightGroup.objectives[0];
        if (leftFirstObjective && rightFirstObjective) {
          return this.compareObjectiveCodes(leftFirstObjective.codigo, rightFirstObjective.codigo);
        }
        return leftGroup.axis.localeCompare(rightGroup.axis, 'es', { sensitivity: 'base' });
      });
  });

  readonly selectedCurriculumObjectivePreview = computed(() => {
    const selectedOptionId = this.selectedCurriculumObjectiveOptionId();
    return this.filteredCurriculumObjectives().find((objective) => objective.id === selectedOptionId)
      ?? this.curriculumObjectives().find((objective) => objective.id === selectedOptionId)
      ?? null;
  });

  readonly workedCurriculumAxes = computed(() => {
    const axes = new Set<string>();
    for (const objective of this.selectedCurriculumObjectives()) {
      if (objective.eje?.trim()) {
        axes.add(objective.eje.trim());
      }
    }
    return Array.from(axes.values());
  });

  readonly selectedCurriculumSubjectName = computed(() => {
    return this.resolvePlanningSubjectName() || 'Pendiente';
  });

  readonly selectedCurriculumGradeLabel = computed(() => {
    return this.resolvePlanningCourseName() || 'Pendiente';
  });

  readonly curriculumAvailabilityMessage = computed(() => {
    const subjectName = this.resolvePlanningSubjectName();
    const courseName = this.resolvePlanningCourseName();

    if (!subjectName || !courseName) {
      return 'Selecciona una asignatura y un curso para buscar OA oficiales.';
    }

    if (this.isCurriculumLoading()) {
      return 'Cargando OA oficiales...';
    }

    const gradeCodes = this.extractGradeCodes(courseName);
    if (gradeCodes.length === 0 || gradeCodes.every((gradeCode) => !['1', '2', '3', '4', '5', '6'].includes(gradeCode))) {
      return `El curso ${courseName} no tiene OA oficiales cargados para ${subjectName}.`;
    }

    if (this.curriculumObjectives().length === 0) {
      return `No se encontraron OA oficiales para ${subjectName} en ${courseName}.`;
    }

    return 'No hay OA seleccionados.';
  });

  readonly selectedDurationLabel = computed(() => {
    const durationCode = this.formValue().durationCode;
    if (!durationCode) {
      return 'Duracion pendiente';
    }
    return this.catalogs()?.durationOptions.find((item) => item.code === durationCode)?.label ?? durationCode;
  });

  readonly plannedDateLabel = computed(() => {
    const plannedDate = this.formValue().plannedDate;
    if (!plannedDate) {
      return 'Fecha pendiente';
    }
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    }).format(plannedDate);
  });

  readonly plannedDateInputValue = computed(() => {
    const plannedDate = this.formValue().plannedDate;
    return plannedDate ? this.formatDate(plannedDate) : '';
  });

  readonly plannerSubtitle = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) {
      return 'Selecciona una unidad para completar asignatura, curso y OA';
    }
    return `${unit.subjectName} · ${unit.courseName} · ${unit.unitNumberLabel}`;
  });

  constructor() {
    this.loadCatalogs();
    this.form.controls.unitId.valueChanges.subscribe((unitId) => {
      this.form.controls.objectiveCode.setValue('', { emitEvent: false });
      const unit = this.catalogs()?.units.find((item) => item.unitId === unitId);
      if (unit) {
        this.selectedSubjectId.set(unit.subjectId);
        this.selectedCourseId.set(unit.courseId);
        this.form.controls.subjectId.setValue(unit.subjectId, { emitEvent: false });
        this.form.controls.courseId.setValue(unit.courseId, { emitEvent: false });
        this.syncCurriculumObjectivesFromPlanningContext();
      }
    });
  }

  updateSubject(value: string): void {
    const subjectId = Number(value);
    const nextSubjectId = Number.isFinite(subjectId) ? subjectId : null;
    this.selectedSubjectId.set(nextSubjectId);
    this.form.controls.subjectId.setValue(nextSubjectId, { emitEvent: false });

    const firstCourse = this.courseOptions()[0] ?? null;
    this.selectedCourseId.set(firstCourse?.id ?? null);
    this.form.controls.courseId.setValue(firstCourse?.id ?? null, { emitEvent: false });
    this.selectFirstFilteredUnit();
    this.syncCurriculumObjectivesFromPlanningContext();
  }

  updateCourse(value: string): void {
    const courseId = Number(value);
    const nextCourseId = Number.isFinite(courseId) ? courseId : null;
    this.selectedCourseId.set(nextCourseId);
    this.form.controls.courseId.setValue(nextCourseId, { emitEvent: false });
    this.selectFirstFilteredUnit();
    this.syncCurriculumObjectivesFromPlanningContext();
  }

  updateUnit(value: string): void {
    const unitId = Number(value);
    if (!Number.isFinite(unitId)) {
      this.form.controls.unitId.setValue(null);
      return;
    }

    this.form.controls.unitId.setValue(unitId);
  }

  updatePlannedDate(value: string): void {
    this.form.controls.plannedDate.setValue(value ? new Date(`${value}T00:00:00`) : null);
    this.form.controls.plannedDate.markAsTouched();
  }

  addSelectedObjective(): void {
    const currentObjectiveCode = this.form.controls.objectiveCode.value;
    if (currentObjectiveCode) {
      this.snackBar.open(`OA ${currentObjectiveCode} agregado`, 'Cerrar', { duration: 2200 });
      return;
    }

    const firstObjective = this.objectiveOptions()[0];
    if (!firstObjective) {
      this.snackBar.open('No hay OA disponibles para esta unidad', 'Cerrar', { duration: 2600 });
      return;
    }

    this.form.controls.objectiveCode.setValue(firstObjective.code);
    this.snackBar.open(`OA ${firstObjective.code} agregado`, 'Cerrar', { duration: 2200 });
  }

  setStartStrategy(value: string): void {
    this.startStrategy.set(value);
  }

  setGroupingMode(value: string): void {
    this.groupingMode.set(value);
  }

  updateReflectionSuccess(value: string): void {
    this.reflectionSuccess.set(value);
  }

  updateReflectionImprove(value: string): void {
    this.reflectionImprove.set(value);
  }

  updateObjectiveAchievement(value: string): void {
    const parsed = Number(value);
    this.objectiveAchievement.set(Number.isFinite(parsed) ? parsed : 75);
  }

  updateDiversityNotes(value: string): void {
    this.diversityNotes.set(value);
    if (value.trim() !== this.lastAutoDiversityNote().trim()) {
      this.lastAutoDiversityNote.set('');
    }
  }

  selectEvaluationType(code: string): void {
    this.form.controls.evaluationType.setValue(code);
  }

  selectLearningApproach(value: string): void {
    this.selectedLearningApproach.set(value);
  }

  selectInstrument(value: string): void {
    this.selectedInstrument.set(value);
  }

  toggleResource(value: string): void {
    this.toggleChipState(this.activeResources, value, 'multiple');
  }

  toggleDiversitySupport(value: string): void {
    this.toggleChipState(this.activeDiversitySupports, value, 'multiple');
  }

  isActiveEvaluationType(code: string): boolean {
    return this.form.controls.evaluationType.value === code;
  }

  isActiveLearningApproach(value: string): boolean {
    return this.selectedLearningApproach() === value;
  }

  isActiveInstrument(value: string): boolean {
    return this.selectedInstrument() === value;
  }

  hasActiveResource(value: string): boolean {
    return this.activeResources().includes(value);
  }

  hasActiveDiversitySupport(value: string): boolean {
    return this.activeDiversitySupports().includes(value);
  }

  private loadCurriculumObjectivesByContext(subjectName: string, courseName: string): void {
    const normalizedSubjectName = subjectName.trim();
    const normalizedCourseName = courseName.trim();
    if (!normalizedSubjectName || !normalizedCourseName) {
      this.curriculumObjectives.set([]);
      this.selectedCurriculumObjectives.set([]);
      this.selectedCurriculumObjectiveOptionId.set('');
      this.loadedCurriculumContextKey.set('');
      return;
    }

    this.isCurriculumLoading.set(true);
    this.loadedCurriculumGradeCodes.set(this.extractGradeCodes(normalizedCourseName));
    this.loadedCurriculumContextKey.set(`${this.normalizeCompare(normalizedSubjectName)}|${this.normalizeCompare(normalizedCourseName)}`);

    this.curriculumService.getObjectivesByContext(normalizedSubjectName, normalizedCourseName).subscribe({
      next: (objectives) => {
        const currentSelectedOptionId = this.selectedCurriculumObjectiveOptionId();
        const sortedObjectives = [...objectives].sort((left, right) => {
          const axisCompare = (left.eje ?? '').localeCompare((right.eje ?? ''), 'es', { sensitivity: 'base' });
          if (axisCompare !== 0) {
            return axisCompare;
          }
          return this.compareObjectiveCodes(left.codigo, right.codigo);
        });
        this.curriculumObjectives.set(sortedObjectives);
        this.selectedCurriculumObjectives.update((current) =>
          current.filter((selected) => sortedObjectives.some((objective) => objective.id === selected.id))
        );
        const preservedSelectedOptionId = sortedObjectives.some((objective) => objective.id === currentSelectedOptionId)
          ? currentSelectedOptionId
          : '';
        this.selectedCurriculumObjectiveOptionId.set(preservedSelectedOptionId);

        const selectedObjectiveForMetadata = preservedSelectedOptionId
          ? sortedObjectives.find((objective) => objective.id === preservedSelectedOptionId) ?? null
          : this.selectedCurriculumObjectives()[0] ?? null;
        this.applyObjectiveDrivenMetadata(selectedObjectiveForMetadata);
        this.isCurriculumLoading.set(false);
      },
      error: () => {
        this.curriculumObjectives.set([]);
        this.selectedCurriculumObjectives.set([]);
        this.selectedCurriculumObjectiveOptionId.set('');
        this.applyObjectiveDrivenMetadata(null);
        this.isCurriculumLoading.set(false);
      }
    });
  }

  updateCurriculumAxis(value: string): void {
    this.selectedCurriculumAxis.set(value || 'all');
  }

  updateCurriculumType(value: string): void {
    this.selectedCurriculumType.set(value || 'all');
  }

  toggleCurriculumObjective(objective: CurriculumObjective): void {
    this.selectedCurriculumObjectives.update((current) => {
      if (current.some((item) => item.id === objective.id)) {
        return current.filter((item) => item.id !== objective.id);
      }
      return [...current, objective];
    });
  }

  selectCurriculumObjectiveOption(objectiveId: string): void {
    this.selectedCurriculumObjectiveOptionId.set(objectiveId);
    const objective =
      this.filteredCurriculumObjectives().find((item) => item.id === objectiveId) ??
      this.curriculumObjectives().find((item) => item.id === objectiveId) ??
      null;
    this.applyObjectiveDrivenMetadata(objective);
  }

  addSelectedCurriculumObjective(): void {
    const objectiveId = this.selectedCurriculumObjectiveOptionId();
    const objective = this.filteredCurriculumObjectives().find((item) => item.id === objectiveId);
    if (!objective) {
      this.snackBar.open('No hay OA oficiales disponibles para agregar', 'Cerrar', { duration: 2600 });
      return;
    }

    if (this.isCurriculumObjectiveSelected(objective.id)) {
      this.snackBar.open(`El OA ${objective.codigo} ya esta agregado`, 'Cerrar', { duration: 2400 });
      return;
    }

    this.selectedCurriculumObjectives.update((current) => [...current, objective]);
    if (!this.form.controls.objectiveCode.value?.trim()) {
      this.form.controls.objectiveCode.setValue(objective.codigo);
    }
    this.applyObjectiveDrivenMetadata(objective);
    this.snackBar.open(`OA ${objective.codigo} agregado`, 'Cerrar', { duration: 2200 });
  }

  removeCurriculumObjective(objectiveId: string): void {
    this.selectedCurriculumObjectives.update((current) =>
      current.filter((objective) => objective.id !== objectiveId)
    );
    this.applyObjectiveDrivenMetadata(this.previewCurriculumObjective());
  }

  updateCurriculumIndicator(objectiveId: string, value: string): void {
    this.curriculumObjectiveIndicators.update((current) => ({
      ...current,
      [objectiveId]: value
    }));
  }

  curriculumIndicatorValue(objectiveId: string): string {
    return this.curriculumObjectiveIndicators()[objectiveId] ?? '';
  }

  isCurriculumObjectiveSelected(objectiveId: string): boolean {
    return this.selectedCurriculumObjectives().some((objective) => objective.id === objectiveId);
  }

  cancel(): void {
    void this.router.navigate(['/dashboard/planificacion']);
  }

  saveDraft(): void {
    this.submit('draft');
  }

  publishToStudents(): void {
    this.submit('publish');
  }

  generateClassSuggestion(): void {
    const suggestionPayload = this.buildSuggestionPayload();
    if (!suggestionPayload) {
      this.snackBar.open('Debes seleccionar al menos un OA oficial o un OA de la unidad', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.isGeneratingSuggestion.set(true);
    this.suggestionStatus.set(`Leyendo datos del OA ${suggestionPayload.objectiveCode}...`);

    this.planningApiService.generateClassSuggestion(suggestionPayload).subscribe({
      next: (suggestion) => {
        this.form.patchValue({
          title: this.form.controls.title.value?.trim() ? this.form.controls.title.value : suggestion.title,
          startActivity: suggestion.startActivity,
          developmentActivity: suggestion.developmentActivity,
          closingActivity: suggestion.closingActivity
        });

        if (!this.diversityNotes().trim()) {
          this.diversityNotes.set(suggestion.diversitySupport);
        }

        this.isGeneratingSuggestion.set(false);
        this.suggestionStatus.set(suggestion.statusMessage);
        const providerLabel = suggestion.providerUsed?.startsWith('OPENAI:')
          ? `OpenAI (${suggestion.providerUsed.replace('OPENAI:', '')})`
          : suggestion.providerUsed?.startsWith('DEEPSEEK:')
            ? `DeepSeek (${suggestion.providerUsed.replace('DEEPSEEK:', '')})`
            : suggestion.providerUsed?.startsWith('GEMINI:')
              ? `Gemini (${suggestion.providerUsed.replace('GEMINI:', '')})`
              : suggestion.providerUsed?.startsWith('LOCAL_FALLBACK:')
                ? 'modo local de respaldo'
                : 'modo local';
        this.snackBar.open(
          `Sugerencia aplicada desde ${providerLabel} para ${suggestionPayload.objectiveCode}`,
          'Cerrar',
          { duration: 3200 }
        );
      },
      error: (error: HttpErrorResponse) => {
        this.isGeneratingSuggestion.set(false);
        this.suggestionStatus.set('No fue posible generar la sugerencia de clase.');
        this.snackBar.open(
          typeof error.error?.message === 'string' ? error.error.message : 'No fue posible generar la sugerencia de clase',
          'Cerrar',
          { duration: 3200 }
        );
      }
    });
  }

  addDocuments(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length === 0) {
      return;
    }

    const acceptedExtensions = new Set(['pdf', 'docx', 'pptx']);
    const maxSize = 20 * 1024 * 1024;

    const nextDocuments: PendingDocument[] = [];
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!acceptedExtensions.has(extension)) {
        this.snackBar.open(`El archivo ${file.name} no tiene una extension permitida`, 'Cerrar', {
          duration: 3200
        });
        continue;
      }

      if (file.size > maxSize) {
        this.snackBar.open(`El archivo ${file.name} supera el limite de 20 MB`, 'Cerrar', {
          duration: 3200
        });
        continue;
      }

      nextDocuments.push({ file, visibleToStudents: true });
    }

    this.pendingDocuments.update((current) => [...current, ...nextDocuments]);
    input.value = '';
  }

  removePendingDocument(index: number): void {
    this.pendingDocuments.update((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  toggleDocumentVisibility(index: number, visibleToStudents: boolean): void {
    this.pendingDocuments.update((current) =>
      current.map((document, itemIndex) =>
        itemIndex === index ? { ...document, visibleToStudents } : document
      )
    );
  }

  private loadCatalogs(): void {
    this.planningApiService.getClassCatalogs().subscribe({
      next: (catalogs) => {
        this.catalogs.set(catalogs);
        const classId = this.editingClassId();
        if (classId === null) {
          this.initializeDefaults(catalogs);
          this.isLoading.set(false);
          return;
        }

        this.loadClassForEdit(classId);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar los catalogos de nueva clase',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }

  private submit(mode: ClassFormMode): void {
    if (this.isSaving()) {
      return;
    }

    if (mode === 'publish') {
      this.form.controls.objectiveCode.addValidators(Validators.required);
      this.form.controls.evaluationType.addValidators(Validators.required);
      this.form.controls.startActivity.addValidators(Validators.required);
      this.form.controls.developmentActivity.addValidators(Validators.required);
      this.form.controls.closingActivity.addValidators(Validators.required);
    } else {
      this.form.controls.objectiveCode.removeValidators(Validators.required);
      this.form.controls.evaluationType.removeValidators(Validators.required);
      this.form.controls.startActivity.removeValidators(Validators.required);
      this.form.controls.developmentActivity.removeValidators(Validators.required);
      this.form.controls.closingActivity.removeValidators(Validators.required);
    }

    this.form.controls.objectiveCode.updateValueAndValidity();
    this.form.controls.evaluationType.updateValueAndValidity();
    this.form.controls.startActivity.updateValueAndValidity();
    this.form.controls.developmentActivity.updateValueAndValidity();
    this.form.controls.closingActivity.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();
    const classId = this.editingClassId();
    const request$ = classId !== null
      ? this.planningApiService.updateClass(classId, payload)
      : mode === 'draft'
        ? this.planningApiService.saveClassDraft(payload)
        : this.planningApiService.createClass(payload);

    this.isSaving.set(true);
    request$
      .pipe(
        switchMap((planningClass) => {
          const documents = this.pendingDocuments();
          if (documents.length === 0) {
            return of(planningClass);
          }

          return forkJoin(
            documents.map((document) =>
              this.planningApiService
                .uploadClassDocument(planningClass.id, document.file, document.visibleToStudents)
                .pipe(catchError(() => of(null)))
            )
          ).pipe(map(() => planningClass));
        })
      )
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open(
            classId !== null
              ? 'Planificacion actualizada correctamente'
              : mode === 'draft'
              ? 'Clase guardada como borrador'
              : 'Clase publicada correctamente para continuar el flujo docente',
            'Cerrar',
            { duration: 3200 }
          );
          void this.router.navigate(['/dashboard/planificacion']);
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.snackBar.open(
            typeof error.error?.message === 'string'
              ? error.error.message
              : 'No fue posible guardar la clase planificada',
            'Cerrar',
            { duration: 3500 }
          );
        }
      });
  }

  private toPayload(): PlanningClassPayload {
    const value = this.form.getRawValue();
    return {
      unitId: value.unitId!,
      durationCode: value.durationCode!,
      plannedDate: this.formatDate(value.plannedDate!),
      title: value.title!.trim(),
      objectiveCode: value.objectiveCode?.trim() ?? '',
      evaluationType: value.evaluationType?.trim() ?? '',
      objectiveDescription:
        this.selectedCurriculumObjectives()[0]?.descripcion ??
        this.selectedObjective()?.description ??
        this.selectedUnit()?.learningObjectives ??
        '',
      startActivity: value.startActivity?.trim() ?? '',
      developmentActivity: value.developmentActivity?.trim() ?? '',
      closingActivity: value.closingActivity?.trim() ?? '',
      objectiveIds: this.selectedCurriculumObjectives().map((objective) => objective.id)
    };
  }

  private initializeDefaults(catalogs: PlanningClassCatalogs): void {
    const firstUnit = catalogs.units[0] ?? null;
    if (firstUnit) {
      this.selectedSubjectId.set(firstUnit.subjectId);
      this.selectedCourseId.set(firstUnit.courseId);
      this.form.controls.subjectId.setValue(firstUnit.subjectId, { emitEvent: false });
      this.form.controls.courseId.setValue(firstUnit.courseId, { emitEvent: false });
      this.form.controls.unitId.setValue(firstUnit.unitId);
    }

    const firstDuration = catalogs.durationOptions[0];
    if (firstDuration && !this.form.controls.durationCode.value) {
      this.form.controls.durationCode.setValue(firstDuration.code);
    }

    const firstEvaluation = catalogs.evaluationTypes[0];
    if (firstEvaluation && !this.form.controls.evaluationType.value) {
      this.form.controls.evaluationType.setValue(firstEvaluation.code);
    }

    this.syncCurriculumObjectivesFromPlanningContext();
  }

  private loadClassForEdit(classId: number): void {
    this.planningApiService.getClassById(classId).pipe(
      catchError(() =>
        this.planningApiService.getClasses().pipe(
          map((classes) => {
            const planningClass = classes.find((item) => item.id === classId);
            if (!planningClass) {
              throw new Error('Planificacion no encontrada');
            }
            return planningClass;
          }),
          catchError((error) => throwError(() => error))
        )
      )
    ).subscribe({
      next: (planningClass) => {
        this.patchFormForEdit(planningClass);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar la planificacion para editar',
          'Cerrar',
          { duration: 3500 }
        );
        void this.router.navigate(['/dashboard/planificacion']);
      }
    });
  }

  private patchFormForEdit(planningClass: PlanningClass): void {
    this.selectedSubjectId.set(planningClass.subjectId);
    this.selectedCourseId.set(planningClass.courseId);
    this.form.patchValue({
      unitId: planningClass.unitId,
      durationCode: planningClass.durationCode,
      plannedDate: new Date(`${planningClass.plannedDate}T00:00:00`),
      title: planningClass.title,
      subjectId: planningClass.subjectId,
      courseId: planningClass.courseId,
      objectiveCode: planningClass.objectiveCode,
      evaluationType: planningClass.evaluationType,
      startActivity: planningClass.startActivity,
      developmentActivity: planningClass.developmentActivity,
      closingActivity: planningClass.closingActivity
    });
    this.selectedCurriculumObjectives.set(planningClass.curriculumObjectives ?? []);
    this.syncCurriculumObjectivesFromPlanningContext();
  }

  private selectFirstFilteredUnit(): void {
    const firstUnit = this.filteredUnits()[0] ?? null;
    this.form.controls.unitId.setValue(firstUnit?.unitId ?? null);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resolveEditingClassId(): number | null {
    const value = this.route.snapshot.paramMap.get('id');
    if (!value) {
      return null;
    }

    const classId = Number(value);
    return Number.isFinite(classId) ? classId : null;
  }

  private toggleChipState(
    source: WritableSignal<string[]>,
    value: string,
    mode: ChipGroupMode
  ): void {
    if (mode === 'single') {
      source.set([value]);
      return;
    }

    source.update((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  private buildSuggestionPayload(): PlanningClassSuggestionPayload | null {
    const subjectName = this.resolvePlanningSubjectName();
    const courseName = this.resolvePlanningCourseName();
    if (!subjectName || !courseName) {
      return null;
    }

    const curriculumObjective = this.selectedCurriculumObjectives()[0];
    if (curriculumObjective) {
      return {
        subjectName,
        courseName,
        objectiveCode: curriculumObjective.codigo,
        objectiveDescription: curriculumObjective.descripcion,
        objectiveType: curriculumObjective.tipo,
        objectiveAxis: curriculumObjective.eje,
        subItems: curriculumObjective.subItems ?? []
      };
    }

    const planningObjective = this.selectedObjective();
    if (!planningObjective) {
      return null;
    }

    return {
      subjectName,
      courseName,
      objectiveCode: planningObjective.code,
      objectiveDescription: planningObjective.description,
      objectiveType: 'conocimiento',
      objectiveAxis: planningObjective.axis,
      subItems: []
    };
  }

  private syncCurriculumObjectivesFromPlanningContext(): void {
    const planningSubjectName = this.resolvePlanningSubjectName();
    const planningCourseName = this.resolvePlanningCourseName();
    if (!planningSubjectName || !planningCourseName) {
      return;
    }

    const contextKey = `${this.normalizeCompare(planningSubjectName)}|${this.normalizeCompare(planningCourseName)}`;
    const shouldReload =
      this.curriculumObjectives().length === 0 ||
      this.loadedCurriculumContextKey() !== contextKey;

    if (shouldReload) {
      this.loadCurriculumObjectivesByContext(planningSubjectName, planningCourseName);
    }
  }

  private resolvePlanningSubjectName(): string {
    const subjectId = this.selectedSubjectId();
    const selectedSubjectName = this.subjectOptions().find((subject) => subject.id === subjectId)?.name ?? '';
    if (selectedSubjectName) {
      return selectedSubjectName;
    }

    const unit = this.selectedUnit();
    if (unit) {
      return unit.subjectName;
    }

    return '';
  }

  private resolvePlanningCourseName(): string {
    const courseId = this.selectedCourseId();
    const selectedCourseName = this.courseOptions().find((course) => course.id === courseId)?.name ?? '';
    if (selectedCourseName) {
      return selectedCourseName;
    }

    const unit = this.selectedUnit();
    if (unit) {
      return unit.courseName;
    }

    return '';
  }

  private extractGradeCodes(courseName: string): string[] {
    const matches = courseName.match(/\d+/g) ?? [];
    return Array.from(new Set(matches));
  }

  private applyObjectiveDrivenMetadata(objective: CurriculumObjective | null): void {
    if (!objective) {
      return;
    }

    const suggestedEvaluationType = objective.suggestedEvaluationType?.trim() || 'FORMATIVA';
    const suggestedLearningApproach = objective.suggestedLearningApproach?.trim() || 'Para el aprendizaje';
    const suggestedInstrument = objective.suggestedInstrument?.trim() || 'Rubrica';
    const suggestedResources = objective.suggestedResources?.length
      ? objective.suggestedResources
      : ['Guia impresa'];
    const suggestedDiversityNote = objective.suggestedDiversityNote?.trim() || this.buildSuggestedDiversityNote(objective);

    this.form.controls.evaluationType.setValue(suggestedEvaluationType);
    this.selectedLearningApproach.set(suggestedLearningApproach);
    this.selectedInstrument.set(suggestedInstrument);
    this.activeResources.set(suggestedResources);

    if (!this.diversityNotes().trim() || this.diversityNotes().trim() === this.lastAutoDiversityNote().trim()) {
      this.diversityNotes.set(suggestedDiversityNote);
      this.lastAutoDiversityNote.set(suggestedDiversityNote);
    }
  }

  private buildSuggestedSkills(objective: CurriculumObjective): string[] {
    if (objective.suggestedSkills?.length) {
      return objective.suggestedSkills;
    }
    const normalizedAxis = this.normalizeCompare(objective.eje || '');
    const normalizedDescription = this.normalizeCompare(objective.descripcion || '');
    const skills: string[] = [];

    if (objective.tipo === 'habilidad') {
      skills.push('Aplicar estrategias');
    }
    if (this.matchesAny(normalizedAxis, ['apreciar', 'responder']) || this.matchesAny(normalizedDescription, ['describir', 'explicar', 'comunicar'])) {
      skills.push('Comunicar');
      skills.push('Argumentar');
    }
    if (this.matchesAny(normalizedDescription, ['observar', 'identificar', 'analizar'])) {
      skills.push('Observar');
      skills.push('Analizar');
    }
    if (this.matchesAny(normalizedDescription, ['crear', 'expresar', 'aplicar', 'experimentar'])) {
      skills.push('Crear');
    }
    if (skills.length === 0) {
      skills.push('Crear', 'Analizar');
    }

    return Array.from(new Set(skills)).slice(0, 4);
  }

  private buildSuggestedAttitudes(objective: CurriculumObjective): string[] {
    if (objective.suggestedAttitudes?.length) {
      return objective.suggestedAttitudes;
    }
    const normalizedAxis = this.normalizeCompare(objective.eje || '');
    const normalizedDescription = this.normalizeCompare(objective.descripcion || '');
    const attitudes: string[] = ['Trabajo colaborativo'];

    if (this.matchesAny(normalizedAxis, ['apreciar', 'responder']) || this.matchesAny(normalizedDescription, ['opinion', 'impresion', 'preferencia'])) {
      attitudes.unshift('Respetar y valorar las ideas y obras de sus companeros.');
    }
    if (this.matchesAny(normalizedDescription, ['crear', 'experimentar', 'trabajos de arte'])) {
      attitudes.push('Cuidar los materiales y el espacio de trabajo.');
    }
    if (this.matchesAny(normalizedDescription, ['observar', 'analizar', 'investigar'])) {
      attitudes.push('Mantener curiosidad y disposicion para explorar nuevas ideas.');
    }

    return Array.from(new Set(attitudes)).slice(0, 3);
  }

  private buildSuggestedDiversityNote(objective: CurriculumObjective): string {
    const normalizedDescription = this.normalizeCompare(objective.descripcion || '');

    if (this.matchesAny(normalizedDescription, ['oral', 'comunicar', 'explicar', 'describir'])) {
      return 'Permitir respuestas orales, apoyos visuales y modelado de vocabulario para estudiantes que requieran andamiaje en expresion y comprension.';
    }

    if (this.matchesAny(normalizedDescription, ['crear', 'dibujar', 'pintar', 'modelar', 'construir'])) {
      return 'Ofrecer materiales adaptados, pasos visuales y opciones de trabajo guiado para estudiantes que requieran apoyo motor, atencional o de organizacion.';
    }

    if (this.matchesAny(normalizedDescription, ['observar', 'identificar', 'analizar', 'investigar'])) {
      return 'Entregar instrucciones fragmentadas, ejemplos concretos y acompanamiento por etapas para facilitar la observacion, el registro y la explicacion del aprendizaje.';
    }

    return 'Considerar apoyos visuales, consignas breves y alternativas de respuesta oral o practica para estudiantes con NEE o diferenciacion por nivel.';
  }

  private matchesAny(value: string, fragments: string[]): boolean {
    return fragments.some((fragment) => value.includes(fragment));
  }

  private normalizeCompare(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private compareCourseNames(left: string, right: string): number {
    const leftGrades = this.extractGradeCodes(left).map((value) => Number(value));
    const rightGrades = this.extractGradeCodes(right).map((value) => Number(value));
    const leftFirstGrade = leftGrades[0] ?? Number.MAX_SAFE_INTEGER;
    const rightFirstGrade = rightGrades[0] ?? Number.MAX_SAFE_INTEGER;

    if (leftFirstGrade !== rightFirstGrade) {
      return leftFirstGrade - rightFirstGrade;
    }

    const leftLastGrade = leftGrades[leftGrades.length - 1] ?? leftFirstGrade;
    const rightLastGrade = rightGrades[rightGrades.length - 1] ?? rightFirstGrade;
    if (leftLastGrade !== rightLastGrade) {
      return leftLastGrade - rightLastGrade;
    }

    return left.localeCompare(right, 'es', { sensitivity: 'base' });
  }

  private compareObjectiveCodes(leftCode: string, rightCode: string): number {
    const leftParts = this.parseObjectiveCode(leftCode);
    const rightParts = this.parseObjectiveCode(rightCode);

    if (leftParts.prefix !== rightParts.prefix) {
      return leftParts.prefix.localeCompare(rightParts.prefix, 'es', { sensitivity: 'base' });
    }
    if (leftParts.numeric !== rightParts.numeric) {
      return leftParts.numeric - rightParts.numeric;
    }
    if (leftParts.suffixWeight !== rightParts.suffixWeight) {
      return leftParts.suffixWeight - rightParts.suffixWeight;
    }
    return leftParts.suffix.localeCompare(rightParts.suffix, 'es', { sensitivity: 'base' });
  }

  private parseObjectiveCode(code: string): {
    prefix: string;
    numeric: number;
    suffix: string;
    suffixWeight: number;
  } {
    const normalized = code.trim();
    const match = normalized.match(/^([A-Za-z]+)[_\-]?(\d+)?([A-Za-z_]*)$/);
    if (!match) {
      return {
        prefix: normalized,
        numeric: Number.MAX_SAFE_INTEGER,
        suffix: '',
        suffixWeight: 1
      };
    }

    const [, prefix = normalized, numericPart = '', suffix = ''] = match;
    return {
      prefix,
      numeric: numericPart ? Number(numericPart) : Number.MAX_SAFE_INTEGER,
      suffix,
      suffixWeight: suffix ? 1 : 0
    };
  }

  formatObjectiveOption(objective: CurriculumObjective): string {
    const baseLabel = `${objective.codigo}: ${objective.descripcion}`;
    if (baseLabel.length <= 88) {
      return baseLabel;
    }
    return `${baseLabel.slice(0, 85).trimEnd()}...`;
  }

  isControlInvalid(
    controlName:
      | 'title'
      | 'subjectId'
      | 'courseId'
      | 'unitId'
      | 'plannedDate'
      | 'startActivity'
      | 'developmentActivity'
      | 'closingActivity'
  ): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getControlError(
    controlName:
      | 'title'
      | 'subjectId'
      | 'courseId'
      | 'unitId'
      | 'plannedDate'
      | 'startActivity'
      | 'developmentActivity'
      | 'closingActivity'
  ): string {
    const control = this.form.controls[controlName];
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    return 'Revisa este campo.';
  }
}
