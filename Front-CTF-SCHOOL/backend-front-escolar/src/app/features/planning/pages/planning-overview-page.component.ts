import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  PlanningSummary,
  PlanningSummaryMetrics,
  PlanningSummaryStatus,
  PlanningSummaryUnit
} from '../../../core/models/planning.models';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

@Component({
  selector: 'app-planning-overview-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    TeacherSideMenuComponent
  ],
  templateUrl: './planning-overview-page.component.html',
  styleUrl: './planning-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningOverviewPageComponent {
  private readonly planningApiService = inject(PlanningApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(true);
  readonly activeSubjectId = signal<number | null>(null);
  readonly dashboard = signal<PlanningSummary | null>(null);

  readonly metrics = computed<PlanningSummaryMetrics>(() =>
    this.dashboard()?.summary ?? {
      totalUnits: 0,
      totalClasses: 0,
      publishedClasses: 0,
      totalDocuments: 0,
      visibleDocuments: 0,
      semesterProgressPercent: 0
    }
  );

  readonly metricCards = computed(() => [
    {
      label: 'Unidades creadas',
      value: this.metrics().totalUnits,
      detail: `${this.dashboard()?.subjects.length ?? 0} asignaturas`,
      tone: 'primary'
    },
    {
      label: 'Clases planificadas',
      value: this.metrics().totalClasses,
      detail: `${this.metrics().publishedClasses} publicadas`,
      tone: 'success'
    },
    {
      label: 'Documentos subidos',
      value: this.metrics().totalDocuments,
      detail: `${this.metrics().visibleDocuments} visibles a alumnos`,
      tone: 'accent'
    },
    {
      label: 'Progreso semestre',
      value: `${this.metrics().semesterProgressPercent}%`,
      detail: 'avance consolidado',
      tone: 'warning'
    }
  ]);

  readonly subjectFilters = computed(() => this.dashboard()?.subjects ?? []);
  readonly units = computed(() => this.dashboard()?.units ?? []);

  constructor() {
    this.loadSummary();
  }

  selectSubject(subjectId: number | null): void {
    this.activeSubjectId.set(subjectId);
    this.loadSummary();
  }

  statusLabel(status: PlanningSummaryStatus): string {
    switch (status) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'ACTIVA':
        return 'Activa';
      case 'COMPLETADA':
        return 'Completada';
      default:
        return status;
    }
  }

  statusClass(status: PlanningSummaryStatus): string {
    return `status-${status.toLowerCase()}`;
  }

  private loadSummary(): void {
    this.isLoading.set(true);
    this.planningApiService
      .getPlanningSummary(this.activeSubjectId() != null ? { subjectId: this.activeSubjectId()! } : {})
      .subscribe({
        next: (summary) => {
          this.dashboard.set(summary);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.snackBar.open(
            typeof error.error?.message === 'string'
              ? error.error.message
              : 'No fue posible cargar el resumen semestral de planificacion',
            'Cerrar',
            { duration: 3500 }
          );
        }
      });
  }
}
