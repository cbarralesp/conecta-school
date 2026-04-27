import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  PlanningObjectiveOption
} from '../../../core/models/planning.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type ClassFormMode = 'draft' | 'publish';

type PendingDocument = {
  file: File;
  visibleToStudents: boolean;
};

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

  readonly subjectOptions = computed(() => {
    const subjects = new Map<number, { id: number; name: string }>();
    for (const unit of this.catalogs()?.units ?? []) {
      if (!subjects.has(unit.subjectId)) {
        subjects.set(unit.subjectId, { id: unit.subjectId, name: unit.subjectName });
      }
    }
    return Array.from(subjects.values());
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
    return Array.from(courses.values());
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
  }

  updateCourse(value: string): void {
    const courseId = Number(value);
    const nextCourseId = Number.isFinite(courseId) ? courseId : null;
    this.selectedCourseId.set(nextCourseId);
    this.form.controls.courseId.setValue(nextCourseId, { emitEvent: false });
    this.selectFirstFilteredUnit();
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

  cancel(): void {
    void this.router.navigate(['/dashboard/planificacion']);
  }

  saveDraft(): void {
    this.submit('draft');
  }

  publishToStudents(): void {
    this.submit('publish');
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
      objectiveDescription: this.selectedObjective()?.description ?? this.selectedUnit()?.learningObjectives ?? '',
      startActivity: value.startActivity?.trim() ?? '',
      developmentActivity: value.developmentActivity?.trim() ?? '',
      closingActivity: value.closingActivity?.trim() ?? ''
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
}
