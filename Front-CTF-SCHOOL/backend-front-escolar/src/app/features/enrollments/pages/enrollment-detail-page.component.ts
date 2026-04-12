import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentDetail } from '../../../core/models/enrollment.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

@Component({
  selector: 'app-enrollment-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    TeacherSideMenuComponent
  ],
  templateUrl: './enrollment-detail-page.component.html',
  styleUrl: './enrollment-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly enrollmentId = Number(this.route.snapshot.paramMap.get('id'));
  readonly detail = signal<EnrollmentDetail | null>(null);
  readonly isLoading = signal(true);
  readonly avatar = computed(() => {
    const detail = this.detail();
    if (!detail) {
      return '--';
    }
    return `${detail.studentName.charAt(0)}${detail.studentLastName.charAt(0)}`.toUpperCase();
  });

  constructor() {
    this.loadDetail();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  goToEdit(): void {
    void this.router.navigate(['/dashboard/matriculas', this.enrollmentId, 'editar']);
  }

  deleteEnrollment(): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    const ref = this.snackBar.open(`Eliminar matricula de ${detail.studentName}?`, 'Confirmar', {
      duration: 5000
    });
    ref.onAction().subscribe(() => {
      this.enrollmentApiService.delete(this.enrollmentId).subscribe({
        next: () => {
          this.snackBar.open('Matricula eliminada correctamente', 'Cerrar', { duration: 2500 });
          void this.router.navigate(['/dashboard/matriculas']);
        },
        error: (error: HttpErrorResponse) =>
          this.showError(error, 'No fue posible eliminar la matricula')
      });
    });
  }

  private loadDetail(): void {
    this.enrollmentApiService.getById(this.enrollmentId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la ficha del alumno');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
