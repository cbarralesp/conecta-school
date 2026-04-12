import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TeacherPlanningDetail } from '../../../core/models/teacher-dashboard.models';
import { TeacherDashboardApiService } from '../../../core/services/teacher-dashboard-api.service';

@Component({
  selector: 'app-planning-detail-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './planning-detail-page.component.html',
  styleUrl: './planning-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly teacherDashboardApiService = inject(TeacherDashboardApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly planning = signal<TeacherPlanningDetail | null>(null);
  readonly statusOptions = ['PLANIFICADA', 'EN_REVISION', 'COMPLETADA'];

  readonly planningForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    unit: ['', [Validators.required]],
    learningObjective: ['', [Validators.required]],
    status: ['PLANIFICADA', [Validators.required]],
    classDate: ['', [Validators.required]],
    resources: ['', [Validators.required]],
    activities: ['', [Validators.required]],
    evaluation: ['', [Validators.required]],
    observations: ['']
  });

  constructor() {
    this.loadPlanning();
  }

  backToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  save(): void {
    const planningId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.planningForm.invalid || this.isSaving()) {
      this.planningForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.teacherDashboardApiService
      .updatePlanning(planningId, this.planningForm.getRawValue())
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (planning) => {
          this.planning.set(planning);
          this.patchForm(planning);
          this.snackBar.open('Planificacion actualizada correctamente', 'Cerrar', {
            duration: 3000
          });
        },
        error: (error: HttpErrorResponse) => {
          this.snackBar.open(
            typeof error.error?.message === 'string'
              ? error.error.message
              : 'No fue posible guardar la planificacion',
            'Cerrar',
            { duration: 3500 }
          );
        }
      });
  }

  private loadPlanning(): void {
    const planningId = Number(this.route.snapshot.paramMap.get('id'));
    this.isLoading.set(true);

    this.teacherDashboardApiService.getPlanningDetail(planningId).subscribe({
      next: (planning) => {
        this.planning.set(planning);
        this.patchForm(planning);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar la planificacion',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }

  private patchForm(planning: TeacherPlanningDetail): void {
    this.planningForm.patchValue({
      title: planning.title,
      unit: planning.unit,
      learningObjective: planning.learningObjective,
      status: planning.status,
      classDate: planning.classDate,
      resources: planning.resources,
      activities: planning.activities,
      evaluation: planning.evaluation,
      observations: planning.observations ?? ''
    });
  }
}
