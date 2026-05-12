import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentListItem, EnrollmentOverview, EnrollmentPagination, EnrollmentSummary } from '../../../core/models/enrollment.models';
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
  readonly pageIndex = signal(0);
  readonly filtersForm = this.formBuilder.nonNullable.group({
    search: [''],
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

  goToDetail(enrollmentId: number): void {
    void this.router.navigate(['/dashboard/matriculas', enrollmentId]);
  }

  goToEdit(enrollmentId: number): void {
    void this.router.navigate(['/dashboard/matriculas', enrollmentId, 'editar']);
  }

  confirmDelete(item: EnrollmentListItem): void {
    const ref = this.snackBar.open(`Eliminar matricula de ${item.fullName}?`, 'Confirmar', {
      duration: 5000
    });
    ref.onAction().subscribe(() => {
      this.enrollmentApiService.delete(item.id).subscribe({
        next: () => {
          this.snackBar.open('Matricula eliminada correctamente', 'Cerrar', { duration: 2500 });
          this.loadOverview();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar la matricula')
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

  private loadOverview(): void {
    this.isLoading.set(true);
    this.enrollmentApiService.getOverview({
      search: this.filtersForm.controls.search.value,
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
}
