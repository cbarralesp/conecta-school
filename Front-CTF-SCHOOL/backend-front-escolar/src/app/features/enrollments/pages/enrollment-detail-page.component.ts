import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentCourseOption, EnrollmentDetail, EnrollmentDocument } from '../../../core/models/enrollment.models';
import { normalizeCourseDisplayName } from '../../../core/constants/course-levels';
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
  readonly courses = signal<EnrollmentCourseOption[]>([]);
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
    return `${age} ${age === 1 ? 'Año' : 'Años'}`;
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
    const status = `${student?.status ?? 'ACTIVO'}`.trim().toUpperCase();
    if (status === 'PENDIENTE') {
      return 'Pendiente';
    }
    if (this.isInactiveStatus(status)) {
      return 'Inactiva';
    }
    return 'Activa';
  });
  readonly statusBadgeClass = computed(() => {
    const status = `${this.detail()?.status ?? 'ACTIVO'}`.trim().toUpperCase();
    if (status === 'PENDIENTE') {
      return 'status-badge-large status-badge-large--pending';
    }
    if (this.isInactiveStatus(status)) {
      return 'status-badge-large status-badge-large--inactive';
    }
    return 'status-badge-large';
  });

  readonly documents = computed(() => this.detail()?.documents ?? []);
  readonly selectedCourseOption = computed(() => {
    const detail = this.detail();
    if (!detail) {
      return null;
    }

    return this.courses().find((course) => course.id === detail.courseId) ?? null;
  });
  readonly selectedCourseName = computed(() => {
    const course = this.selectedCourseOption();
    if (course) {
      return normalizeCourseDisplayName(course.name, course.letter);
    }

    return this.detail()?.courseName ?? 'Curso sin asignar';
  });
  readonly courseSnapshot = computed(() => {
    const detail = this.detail();
    const selectedCourse = this.selectedCourseOption();

    if (!detail) {
      return null;
    }

    const rawCourseName = (selectedCourse?.name || detail.courseName || '').trim();
    const normalizedCourseName = selectedCourse
      ? normalizeCourseDisplayName(selectedCourse.name, selectedCourse.letter)
      : rawCourseName || 'Curso sin asignar';

    return {
      displayName: normalizedCourseName,
      level: selectedCourse?.level || this.inferCourseLevel(rawCourseName),
      letter: selectedCourse?.letter || this.inferCourseLetter(rawCourseName),
      schoolYear: selectedCourse?.schoolYear ? `${selectedCourse.schoolYear}` : this.extractSchoolYear(detail.enrollmentDate),
      scheduleType: selectedCourse?.scheduleType || 'Sin jornada'
    };
  });

  constructor() {
    this.loadDetail();
  }

  goToEdit(): void {
    void this.router.navigate(['/dashboard/matriculas', this.enrollmentId, 'editar']);
  }

  reactivateEnrollment(): void {
    this.enrollmentApiService.reactivate(this.enrollmentId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.snackBar.open('Matricula reactivada correctamente', 'Cerrar', {
          duration: 2500
        });
      },
      error: (error: HttpErrorResponse) => {
        this.showError(error, 'No fue posible reactivar la matricula');
      }
    });
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

  documentLabel(document: EnrollmentDocument): string {
    return this.humanizeDocumentKey(document.documentKey) || document.fileName || 'Documento';
  }

  documentStatus(document: EnrollmentDocument): string {
    return document.fileName?.trim() ? 'Recibido' : 'Pendiente';
  }

  documentStatusClass(document: EnrollmentDocument): string {
    return document.fileName?.trim() ? 'doc-status doc-status--received' : 'doc-status doc-status--pending';
  }

  documentIcon(document: EnrollmentDocument): string {
    return document.fileName?.trim() ? 'check_circle' : 'error';
  }

  documentIconClass(document: EnrollmentDocument): string {
    return document.fileName?.trim() ? 'doc-icon doc-icon--received' : 'doc-icon doc-icon--pending';
  }

  private loadDetail(): void {
    this.enrollmentApiService.getOverview().subscribe({
      next: (overview) => {
        this.courses.set(overview.courses);
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

  private humanizeDocumentKey(key: string): string {
    return (key || '')
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private inferCourseLevel(courseName: string): string {
    const normalized = (courseName || '').toUpperCase();
    if (normalized.includes('PREK')) {
      return 'Inicial';
    }
    if (normalized.includes('KIND')) {
      return 'Inicial';
    }
    if (normalized.includes('MEDIO')) {
      return 'Medio';
    }
    if (normalized.includes('BASICO') || normalized.includes('BÁSICO')) {
      return 'Básico';
    }
    return 'Sin nivel';
  }

  private inferCourseLetter(courseName: string): string {
    const parts = (courseName || '').trim().split(/\s+/);
    const lastPart = parts.at(-1) ?? '';
    return /^[A-F]$/i.test(lastPart) ? lastPart.toUpperCase() : '-';
  }

  private extractSchoolYear(enrollmentDate: string): string {
    const match = /^(\d{4})-/.exec(enrollmentDate || '');
    return match?.[1] ?? '-';
  }

  private isInactiveStatus(status: string): boolean {
    return ['INACTIVA', 'INACTIVO'].includes((status || '').trim().toUpperCase());
  }
}
