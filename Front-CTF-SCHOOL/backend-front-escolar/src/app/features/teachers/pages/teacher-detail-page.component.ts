import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { TeacherDetail } from '../../../core/models/teacher.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-teacher-detail-page',
  imports: [
    RouterLink,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './teacher-detail-page.component.html',
  styleUrl: './teacher-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly teacherApiService = inject(TeacherApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly teacherId = Number(this.route.snapshot.paramMap.get('id'));
  readonly user = this.authStateService.user;
  readonly teacher = signal<TeacherDetail | null>(null);
  readonly isLoading = signal(true);

  readonly ageLabel = computed(() => {
    const teacher = this.teacher();
    if (!teacher?.birthDate) {
      return '-';
    }
    const birth = new Date(`${teacher.birthDate}T00:00:00`);
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
    const teacher = this.teacher();
    if (!teacher?.birthDate) {
      return '-';
    }
    const birth = new Date(`${teacher.birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return teacher.birthDate;
    }
    return `${birth.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })} (${this.ageLabel()})`;
  });

  readonly avatar = computed(() => {
    const teacher = this.teacher();
    if (!teacher) {
      return '--';
    }
    const parts = teacher.fullName.split(' ').filter(Boolean);
    return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? ''}`.toUpperCase();
  });

  readonly departmentLabel = computed(() => {
    const teacher = this.teacher();
    return teacher?.subjects[0]?.area || teacher?.subjects[0]?.name || 'Sin area';
  });

  readonly contractSummary = computed(() => {
    const teacher = this.teacher();
    if (!teacher) {
      return '-';
    }
    return `${teacher.contractType} (${teacher.weeklyHours} Hrs)`;
  });

  constructor() {
    this.loadTeacher();
  }

  editTeacher(): void {
    void this.router.navigate(['/dashboard/profesores', this.teacherId, 'editar']);
  }

  openSchedule(): void {
    void this.router.navigate(['/dashboard/horario']);
  }

  openPerformance(): void {
    this.snackBar.open('Mi Rendimiento quedo preparado para la siguiente iteracion', 'Cerrar', {
      duration: 2500
    });
  }

  openContract(): void {
    this.snackBar.open('Ver Contrato quedo preparado para la siguiente iteracion', 'Cerrar', {
      duration: 2500
    });
  }

  contactTeacher(): void {
    const teacher = this.teacher();
    if (!teacher) {
      return;
    }
    window.location.href = `mailto:${teacher.institutionalEmail}`;
  }

  private loadTeacher(): void {
    this.teacherApiService.getById(this.teacherId).subscribe({
      next: (teacher) => {
        this.teacher.set(teacher);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la ficha del profesor');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
