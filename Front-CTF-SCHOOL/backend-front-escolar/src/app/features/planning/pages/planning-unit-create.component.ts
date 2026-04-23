import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  PlanningUnitCatalogAssignment,
  PlanningUnitCatalogs,
  PlanningUnitPayload
} from '../../../core/models/planning.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type UnitFormMode = 'draft' | 'create';

@Component({
  selector: 'app-planning-unit-create',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './planning-unit-create.component.html',
  styleUrl: './planning-unit-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningUnitCreateComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly planningApiService = inject(PlanningApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly catalogs = signal<PlanningUnitCatalogs | null>(null);

  readonly form = this.formBuilder.group(
    {
      subjectId: this.formBuilder.control<number | null>(null, Validators.required),
      courseId: this.formBuilder.control<number | null>(null, Validators.required),
      unitNumber: this.formBuilder.control('', Validators.required),
      name: this.formBuilder.control('', Validators.required),
      startWeek: this.formBuilder.control<number | null>(null),
      startDate: this.formBuilder.control<Date | null>(null, Validators.required),
      endDate: this.formBuilder.control<Date | null>(null, Validators.required),
      estimatedWeeks: this.formBuilder.control<number | null>(1, [Validators.required, Validators.min(1)]),
      plannedClasses: this.formBuilder.control<number | null>(0, [Validators.required, Validators.min(0)]),
      generalDescription: this.formBuilder.control(''),
      learningObjectives: this.formBuilder.control(''),
      achievementIndicators: this.formBuilder.control('')
    },
    { validators: this.dateRangeValidator }
  );

  readonly availableAssignments = computed(() => this.catalogs()?.teachingAssignments ?? []);

  readonly availableSubjects = computed(() => {
    const courseId = this.form.controls.courseId.value;
    const assignments = courseId
      ? this.availableAssignments().filter((assignment) => assignment.courseId === courseId)
      : this.availableAssignments();

    return this.uniqueBy(assignments, 'subjectId');
  });

  readonly availableCourses = computed(() => {
    const subjectId = this.form.controls.subjectId.value;
    const assignments = subjectId
      ? this.availableAssignments().filter((assignment) => assignment.subjectId === subjectId)
      : this.availableAssignments();

    return this.uniqueBy(assignments, 'courseId');
  });

  readonly selectedAssignment = computed(() => {
    const subjectId = this.form.controls.subjectId.value;
    const courseId = this.form.controls.courseId.value;
    if (!subjectId || !courseId) {
      return null;
    }
    return (
      this.availableAssignments().find(
        (assignment) => assignment.subjectId === subjectId && assignment.courseId === courseId
      ) ?? null
    );
  });

  constructor() {
    this.loadCatalogs();
    this.form.controls.subjectId.valueChanges.subscribe(() => this.ensureValidPairing('subject'));
    this.form.controls.courseId.valueChanges.subscribe(() => this.ensureValidPairing('course'));
  }

  cancel(): void {
    void this.router.navigate(['/dashboard/planificacion']);
  }

  saveDraft(): void {
    this.submit('draft');
  }

  createUnit(): void {
    this.submit('create');
  }

  private loadCatalogs(): void {
    this.planningApiService.getUnitCatalogs().subscribe({
      next: (catalogs) => {
        this.catalogs.set(catalogs);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar los catalogos de planificacion',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }

  private submit(mode: UnitFormMode): void {
    if (this.isSaving()) {
      return;
    }

    if (mode === 'create') {
      this.form.controls.learningObjectives.addValidators(Validators.required);
      this.form.controls.achievementIndicators.addValidators(Validators.required);
    } else {
      this.form.controls.learningObjectives.removeValidators(Validators.required);
      this.form.controls.achievementIndicators.removeValidators(Validators.required);
    }

    this.form.controls.learningObjectives.updateValueAndValidity();
    this.form.controls.achievementIndicators.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();
    this.isSaving.set(true);

    const request$ =
      mode === 'draft'
        ? this.planningApiService.saveUnitDraft(payload)
        : this.planningApiService.createUnit(payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open(
          mode === 'draft' ? 'Borrador guardado correctamente' : 'Unidad creada correctamente',
          'Cerrar',
          { duration: 3000 }
        );
        void this.router.navigate(['/dashboard/planificacion']);
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible guardar la unidad',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }

  private toPayload(): PlanningUnitPayload {
    const value = this.form.getRawValue();
    return {
      subjectId: value.subjectId!,
      courseId: value.courseId!,
      unitNumber: value.unitNumber!,
      name: value.name!.trim(),
      startWeek: value.startWeek,
      startDate: this.formatDate(value.startDate!),
      endDate: this.formatDate(value.endDate!),
      estimatedWeeks: value.estimatedWeeks ?? 1,
      plannedClasses: value.plannedClasses ?? 0,
      generalDescription: value.generalDescription?.trim() ?? '',
      learningObjectives: value.learningObjectives?.trim() ?? '',
      achievementIndicators: value.achievementIndicators?.trim() ?? ''
    };
  }

  private ensureValidPairing(changedField: 'subject' | 'course'): void {
    const subjectId = this.form.controls.subjectId.value;
    const courseId = this.form.controls.courseId.value;

    if (!subjectId || !courseId) {
      return;
    }

    const isValid = this.availableAssignments().some(
      (assignment) => assignment.subjectId === subjectId && assignment.courseId === courseId
    );

    if (isValid) {
      return;
    }

    if (changedField === 'subject') {
      this.form.controls.courseId.setValue(null);
    } else {
      this.form.controls.subjectId.setValue(null);
    }
  }

  private uniqueBy(
    assignments: PlanningUnitCatalogAssignment[],
    key: 'subjectId' | 'courseId'
  ): PlanningUnitCatalogAssignment[] {
    const seen = new Set<number>();
    return assignments.filter((assignment) => {
      const id = assignment[key];
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  private dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('startDate')?.value as Date | null;
    const endDate = control.get('endDate')?.value as Date | null;

    if (!startDate || !endDate) {
      return null;
    }

    return endDate >= startDate ? null : { invalidDateRange: true };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
