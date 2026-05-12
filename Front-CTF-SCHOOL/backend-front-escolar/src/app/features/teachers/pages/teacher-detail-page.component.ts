import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { TeacherDetail } from '../../../core/models/teacher.models';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

interface TeacherCourseGroup {
  id: number;
  courseName: string;
  courseCode: string;
  subjects: string[];
  weeklyHours: number;
  homeroomTeacher: boolean;
}

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
  readonly selectedCourse = signal<TeacherCourseGroup | null>(null);
  readonly staffTypeLabel = computed(() => this.teacher()?.staffType === 'ASISTENTE' ? 'Asistente' : 'Docente');
  readonly assignedCourseGroups = computed<TeacherCourseGroup[]>(() => {
    const teacher = this.teacher();
    if (!teacher) {
      return [];
    }

    const grouped = new Map<number, TeacherCourseGroup>();
    teacher.assignedCourses.forEach((course) => {
      const current = grouped.get(course.id);
      if (!current) {
        grouped.set(course.id, {
          id: course.id,
          courseName: course.courseName,
          courseCode: course.courseCode,
          subjects: [course.subjectName],
          weeklyHours: course.weeklyHours,
          homeroomTeacher: course.homeroomTeacher
        });
        return;
      }

      if (!current.subjects.includes(course.subjectName)) {
        current.subjects.push(course.subjectName);
      }
      current.weeklyHours = Math.max(current.weeklyHours, course.weeklyHours);
      current.homeroomTeacher = current.homeroomTeacher || course.homeroomTeacher;
    });

    return Array.from(grouped.values()).sort((left, right) => left.courseName.localeCompare(right.courseName));
  });

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

  openCourseSubjects(course: TeacherCourseGroup): void {
    this.selectedCourse.set(course);
  }

  closeCourseSubjects(): void {
    this.selectedCourse.set(null);
  }

  private loadTeacher(): void {
    this.teacherApiService.getById(this.teacherId).subscribe({
      next: (teacher) => {
        this.teacher.set(teacher);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar la ficha del docente');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
