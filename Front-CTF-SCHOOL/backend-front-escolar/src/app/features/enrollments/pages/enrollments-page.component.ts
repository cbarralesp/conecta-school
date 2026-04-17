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
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentListItem, EnrollmentOverview, EnrollmentSummary } from '../../../core/models/enrollment.models';
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
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly displayedColumns = ['student', 'course', 'guardian', 'status', 'actions'];
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
  readonly enrollments = computed<EnrollmentListItem[]>(() => this.overview()?.enrollments ?? []);
  readonly pageSize = EnrollmentsPageComponent.PAGE_SIZE;
  readonly totalItems = computed(() => this.enrollments().length);
  readonly pagedEnrollments = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.enrollments().slice(start, start + this.pageSize);
  });
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
      const total = this.totalItems();
      const maxPageIndex = Math.max(Math.ceil(total / this.pageSize) - 1, 0);
      if (this.pageIndex() > maxPageIndex) {
        this.pageIndex.set(maxPageIndex);
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

  handlePageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
  }

  private loadOverview(): void {
    this.isLoading.set(true);
    this.enrollmentApiService.getOverview({
      search: this.filtersForm.controls.search.value,
      status: this.filtersForm.controls.status.value || null
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
