import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { Course } from '../../../core/models/course.models';
import { EnrollmentListItem } from '../../../core/models/enrollment.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-course-students-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    RouterLink,
    TeacherModernLayoutComponent
  ],
  templateUrl: './course-students-page.component.html',
  styleUrl: './course-students-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseStudentsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseApiService = inject(CourseApiService);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly courseId = Number(this.route.snapshot.paramMap.get('id'));
  readonly displayedColumns = ['studentRun', 'fullName', 'guardian', 'enrollmentDate', 'status', 'actions'];
  readonly course = signal<Course | null>(null);
  readonly enrollments = signal<EnrollmentListItem[]>([]);
  readonly search = signal('');
  readonly isLoading = signal(true);

  readonly filteredEnrollments = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.enrollments();
    }

    return this.enrollments().filter((enrollment) =>
      enrollment.fullName.toLowerCase().includes(query) ||
      enrollment.studentRun.toLowerCase().includes(query) ||
      enrollment.guardianFullName.toLowerCase().includes(query)
    );
  });

  readonly totalStudents = computed(() => this.enrollments().length);

  constructor() {
    this.loadPage();
  }

  requestDelete(enrollment: EnrollmentListItem): void {
    const ref = this.snackBar.open(
      `Quitar a ${enrollment.fullName} de ${this.course()?.name ?? 'este curso'}?`,
      'Confirmar',
      { duration: 5000 }
    );

    ref.onAction().subscribe(() => {
      this.enrollmentApiService.delete(enrollment.id).subscribe({
        next: () => {
          this.enrollments.update((items) => items.filter((item) => item.id !== enrollment.id));
          this.snackBar.open('Alumno eliminado del curso correctamente', 'Cerrar', { duration: 2600 });
        },
        error: (error: HttpErrorResponse) => {
          this.showError(error, 'No fue posible eliminar el alumno del curso');
        }
      });
    });
  }

  formatDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  private loadPage(): void {
    if (!Number.isFinite(this.courseId) || this.courseId <= 0) {
      this.isLoading.set(false);
      this.snackBar.open('Curso no valido', 'Cerrar', { duration: 3000 });
      void this.router.navigate(['/dashboard/cursos']);
      return;
    }

    this.isLoading.set(true);
    forkJoin({
      course: this.courseApiService.findById(this.courseId),
      overview: this.enrollmentApiService.getOverview({ courseId: this.courseId })
    }).subscribe({
      next: ({ course, overview }) => {
        this.course.set(course);
        this.enrollments.set(
          overview.enrollments.filter((enrollment) => enrollment.courseId === this.courseId)
        );
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los alumnos del curso');
        void this.router.navigate(['/dashboard/cursos']);
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
