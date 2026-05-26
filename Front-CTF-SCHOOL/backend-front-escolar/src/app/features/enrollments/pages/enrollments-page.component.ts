import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentDetail, EnrollmentListItem, EnrollmentOverview, EnrollmentPagination, EnrollmentSummary } from '../../../core/models/enrollment.models';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-enrollments-page',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatTableModule,
    SummaryMetricCardComponent,
    TeacherModernLayoutComponent
  ],
  templateUrl: './enrollments-page.component.html',
  styleUrl: './enrollments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentsPageComponent {
  private static readonly PAGE_SIZE = 10;

  private readonly formBuilder = inject(FormBuilder);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;
  readonly displayedColumns = ['student', 'course', 'enrollmentDate', 'guardian', 'status', 'actions'];
  readonly overview = signal<EnrollmentOverview | null>(null);
  readonly isLoading = signal(true);
  readonly isExporting = signal(false);
  readonly pageIndex = signal(0);
  readonly filtersForm = this.formBuilder.nonNullable.group({
    search: [''],
    courseId: [''],
    status: ['']
  });

  readonly summary = computed<EnrollmentSummary>(() => this.overview()?.summary ?? {
    total: 0,
    active: 0,
    pending: 0,
    courses: 0
  });
  readonly pagination = computed<EnrollmentPagination>(() => this.overview()?.pagination ?? {
    page: 0,
    size: this.pageSize,
    totalItems: 0,
    totalPages: 0
  });
  readonly enrollments = computed<EnrollmentListItem[]>(() => this.overview()?.enrollments ?? []);
  readonly pageSize = EnrollmentsPageComponent.PAGE_SIZE;
  readonly totalItems = computed(() => this.pagination().totalItems);
  readonly pagedEnrollments = computed(() => this.enrollments());
  readonly shouldShowPaginator = computed(() => this.totalItems() > this.pageSize);

  constructor() {
    this.loadOverview();
    this.filtersForm.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex.set(0);
        this.loadOverview();
      });

    effect(() => {
      const pagination = this.pagination();
      const currentPage = this.pageIndex();
      const maxPageIndex = Math.max(pagination.totalPages - 1, 0);

      if (pagination.totalItems > 0 && currentPage > maxPageIndex) {
        this.pageIndex.set(maxPageIndex);
        this.loadOverview();
      }
    });
  }

  goToCreate(): void {
    void this.router.navigate(['/dashboard/matriculas/nueva']);
  }

  courseFilterLabel(course: EnrollmentOverview['courses'][number]): string {
    return course.name;
  }

  exportJson(): void {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    const currentFilters = {
      search: this.filtersForm.controls.search.value,
      courseId: this.selectedCourseId(),
      status: this.filtersForm.controls.status.value || null
    };

    this.enrollmentApiService.getOverview({
      ...currentFilters,
      page: 0,
      size: Math.max(this.totalItems(), this.pageSize, 1)
    }).pipe(
      switchMap((overview) => {
        if (overview.enrollments.length === 0) {
          return of({ overview, details: [] as EnrollmentDetail[] });
        }

        return forkJoin(
          overview.enrollments.map((item) => this.enrollmentApiService.getById(item.id))
        ).pipe(
          switchMap((details) => of({ overview, details }))
        );
      })
    ).subscribe({
      next: ({ overview, details }) => {
        if (details.length === 0) {
          this.isExporting.set(false);
          this.snackBar.open('No hay matrículas para exportar con los filtros actuales', 'Cerrar', {
            duration: 2800
          });
          return;
        }

        const exportPayload = {
          generatedAt: new Date().toISOString(),
          generatedBy: this.user()?.nombre ?? 'Usuario',
          filters: {
            search: currentFilters.search?.trim() || '',
            status: currentFilters.status || 'TODOS'
          },
          summary: overview.summary,
          totalRecords: details.length,
          enrollments: details
        };

        this.downloadJsonFile(exportPayload);
        this.isExporting.set(false);
        this.snackBar.open('JSON descargado correctamente', 'Cerrar', {
          duration: 2400
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isExporting.set(false);
        this.showError(error, 'No fue posible exportar las matrículas en JSON');
      }
    });
  }

  exportPlaceholder(format: 'excel' | 'word' | 'pdf'): void {
    const label = format.toUpperCase();
    this.snackBar.open(`${label} estará disponible próximamente. Por ahora puedes usar JSON.`, 'Cerrar', {
      duration: 2800
    });
  }

  goToDetail(enrollmentId: number): void {
    void this.router.navigate(['/dashboard/matriculas', enrollmentId]);
  }

  goToEdit(enrollmentId: number): void {
    void this.router.navigate(['/dashboard/matriculas', enrollmentId, 'editar']);
  }

  confirmDelete(item: EnrollmentListItem): void {
    const isInactive = this.isInactive(item.status);
    const ref = this.snackBar.open(
      isInactive
        ? `Eliminar definitivamente la matricula de ${item.fullName}?`
        : `Inactivar matricula de ${item.fullName}?`,
      'Confirmar',
      {
      duration: 5000
      }
    );
    ref.onAction().subscribe(() => {
      this.enrollmentApiService.delete(item.id).subscribe({
        next: () => {
          this.snackBar.open(
            isInactive ? 'Matricula eliminada correctamente' : 'Matricula inactivada correctamente',
            'Cerrar',
            { duration: 2500 }
          );
          this.loadOverview();
        },
        error: (error: HttpErrorResponse) => this.showError(
          error,
          isInactive ? 'No fue posible eliminar la matricula' : 'No fue posible inactivar la matricula'
        )
      });
    });
  }

  reactivateEnrollment(item: EnrollmentListItem): void {
    const ref = this.snackBar.open(`Reactivar matricula de ${item.fullName}?`, 'Confirmar', {
      duration: 5000
    });
    ref.onAction().subscribe(() => {
      this.enrollmentApiService.reactivate(item.id).subscribe({
        next: () => {
          this.snackBar.open('Matricula reactivada correctamente', 'Cerrar', { duration: 2500 });
          this.loadOverview();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible reactivar la matricula')
      });
    });
  }

  initials(item: EnrollmentListItem): string {
    return `${item.studentName.charAt(0)}${item.studentLastName.charAt(0)}`.toUpperCase();
  }

  formatEnrollmentDate(value: string): string {
    if (!value) {
      return '-';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      return value;
    }

    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  handlePageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.loadOverview();
  }

  isInactive(status: string): boolean {
    return ['INACTIVA', 'INACTIVO'].includes(`${status ?? ''}`.trim().toUpperCase());
  }

  private loadOverview(): void {
    this.isLoading.set(true);
    this.enrollmentApiService.getOverview({
      search: this.filtersForm.controls.search.value,
      courseId: this.selectedCourseId(),
      status: this.filtersForm.controls.status.value || null,
      page: this.pageIndex(),
      size: this.pageSize
    }).subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.overview.set(null);
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar las matriculas');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private downloadJsonFile(payload: unknown): void {
    const fileName = this.buildExportFileName();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private buildExportFileName(): string {
    const now = new Date();
    const date = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
    return `matriculas-export-${date}.json`;
  }

  private selectedCourseId(): number | null {
    const value = this.filtersForm.controls.courseId.value.trim();
    if (!value) {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }
}
