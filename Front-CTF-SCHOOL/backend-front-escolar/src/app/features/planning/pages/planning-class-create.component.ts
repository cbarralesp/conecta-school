import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  PlanningClassCatalogs,
  PlanningClassCatalogUnit,
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
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
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
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly catalogs = signal<PlanningClassCatalogs | null>(null);
  readonly pendingDocuments = signal<PendingDocument[]>([]);

  readonly form = this.formBuilder.group({
    unitId: this.formBuilder.control<number | null>(null, Validators.required),
    durationCode: this.formBuilder.control('', Validators.required),
    plannedDate: this.formBuilder.control<Date | null>(null, Validators.required),
    title: this.formBuilder.control('', Validators.required),
    objectiveCode: this.formBuilder.control(''),
    evaluationType: this.formBuilder.control(''),
    startActivity: this.formBuilder.control(''),
    developmentActivity: this.formBuilder.control(''),
    closingActivity: this.formBuilder.control('')
  });
  readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

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

  readonly plannerSubtitle = computed(() => {
    const unit = this.selectedUnit();
    if (!unit) {
      return 'Selecciona una unidad para completar asignatura, curso y OA';
    }
    return `${unit.subjectName} · ${unit.courseName} · ${unit.unitNumberLabel}`;
  });

  constructor() {
    this.loadCatalogs();
    this.form.controls.unitId.valueChanges.subscribe(() => {
      this.form.controls.objectiveCode.setValue('');
    });
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
        this.isLoading.set(false);
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
    const request$ =
      mode === 'draft'
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
            mode === 'draft'
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

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
