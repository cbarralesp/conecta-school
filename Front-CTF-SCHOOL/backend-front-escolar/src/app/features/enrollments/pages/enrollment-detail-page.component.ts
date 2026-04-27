import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentDetail } from '../../../core/models/enrollment.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-enrollment-detail-page',
  imports: [
    RouterLink,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
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

  readonly user = this.authStateService.user;
  readonly enrollmentId = Number(this.route.snapshot.paramMap.get('id'));
  readonly detail = signal<EnrollmentDetail | null>(null);
  readonly isLoading = signal(true);

  readonly fullName = computed(() => {
    const student = this.detail();
    return student ? `${student.studentName} ${student.studentLastName}`.trim() : '';
  });

  readonly avatar = computed(() => {
    const student = this.detail();
    if (!student) {
      return '--';
    }
    return `${student.studentName.charAt(0)}${student.studentLastName.charAt(0)}`.toUpperCase();
  });

  readonly ageLabel = computed(() => {
    const student = this.detail();
    if (!student?.birthDate) {
      return '-';
    }
    const birth = new Date(`${student.birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return '-';
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return `${age} ${age === 1 ? 'Ano' : 'Anos'}`;
  });

  readonly formattedBirthDate = computed(() => {
    const student = this.detail();
    if (!student?.birthDate) {
      return '-';
    }
    const birth = new Date(`${student.birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return student.birthDate;
    }
    return `${birth.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })} (${this.ageLabel()})`;
  });

  readonly statusBadgeLabel = computed(() => {
    const student = this.detail();
    return student?.status === 'PENDIENTE' ? 'Pendiente' : 'Activo';
  });

  constructor() {
    this.loadDetail();
  }

  goToEdit(): void {
    void this.router.navigate(['/dashboard/matriculas', this.enrollmentId, 'editar']);
  }

  printProfile(): void {
    window.print();
  }

  openSchedule(): void {
    void this.router.navigate(['/dashboard/horario']);
  }

  downloadPdf(): void {
    this.snackBar.open('La descarga PDF quedo preparada para la siguiente iteracion', 'Cerrar', {
      duration: 2500
    });
  }

  shareData(): void {
    const student = this.detail();
    if (!student) {
      return;
    }

    const body = [
      `Estudiante: ${student.studentName} ${student.studentLastName}`,
      `RUN: ${student.studentRun}`,
      `Curso: ${student.courseName}`,
      `Apoderado: ${student.guardian.name} ${student.guardian.lastName}`,
      `Telefono: ${student.guardian.phone}`
    ].join('%0D%0A');

    window.location.href = `mailto:${student.guardian.email}?subject=Ficha%20del%20estudiante&body=${body}`;
  }

  private loadDetail(): void {
    this.enrollmentApiService.getById(this.enrollmentId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la ficha del estudiante');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
