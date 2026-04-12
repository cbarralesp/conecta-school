import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentCourseOption, EnrollmentListItem, EnrollmentOverview, EnrollmentSummary } from '../../../core/models/enrollment.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

@Component({
  selector: 'app-enrollments-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatToolbarModule,
    TeacherSideMenuComponent
  ],
  templateUrl: './enrollments-page.component.html',
  styleUrl: './enrollments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentsPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly displayedColumns = ['student', 'course', 'guardian', 'status', 'actions'];
  readonly overview = signal<EnrollmentOverview | null>(null);
  readonly isLoading = signal(true);
  readonly filtersForm = this.formBuilder.nonNullable.group({
    search: [''],
    courseId: [0],
    status: ['']
  });

  readonly summary = computed<EnrollmentSummary>(() => this.overview()?.summary ?? {
    total: 0,
    active: 0,
    pending: 0,
    courses: 0
  });
  readonly courses = computed<EnrollmentCourseOption[]>(() => this.overview()?.courses ?? []);
  readonly enrollments = computed<EnrollmentListItem[]>(() => this.overview()?.enrollments ?? []);

  constructor() {
    this.loadOverview();
    this.filtersForm.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => this.loadOverview());
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
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

  private loadOverview(): void {
    this.isLoading.set(true);
    this.enrollmentApiService.getOverview({
      search: this.filtersForm.controls.search.value,
      courseId: this.filtersForm.controls.courseId.value || null,
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
