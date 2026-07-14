import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherDashboard } from '../../../core/models/teacher-dashboard.models';
import { TeacherDashboardApiService } from '../../../core/services/teacher-dashboard-api.service';
import {
  StudentLifeCourseOption,
  StudentLifeListItem,
  StudentLifeOverview
} from '../../../core/models/student-life.models';
import { StudentLifeApiService } from '../../../core/services/student-life-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly teacherDashboardApiService = inject(TeacherDashboardApiService);
  private readonly studentLifeApiService = inject(StudentLifeApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly dashboard = signal<TeacherDashboard | null>(null);
  readonly isLoadingStudentLife = signal(false);
  readonly lifeLauncherOpen = signal(false);
  readonly lifeLauncherMode = signal<'interview' | 'annotation'>('interview');
  readonly studentLifeOverview = signal<StudentLifeOverview | null>(null);
  readonly selectedLifeCourseId = signal('');
  readonly selectedLifeEnrollmentId = signal('');
  readonly todayHeaderLabel = this.formatTodayHeader();

  readonly modernCards = computed(() => [
    {
      title: 'Cursos asignados',
      value: this.dashboard()?.assignedCoursesCount ?? 0,
      icon: 'school',
      tone: 'primary'
    },
    {
      title: 'Clases planificadas',
      value: this.dashboard()?.plannedClassesCount ?? 0,
      icon: 'calendar_month',
      tone: 'success'
    },
    {
      title: 'Pendientes',
      value: this.dashboard()?.pendingPlanningCount ?? 0,
      icon: 'assignment_late',
      tone: 'warning'
    }
  ]);

  readonly todaySchedulePreview = computed(() => this.dashboard()?.todaySchedulePreview ?? []);

  readonly greetingLabel = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Buenos dias';
    }
    if (hour < 19) {
      return 'Buenas tardes';
    }
    return 'Buenas noches';
  });

  readonly shortTeacherName = computed(() => {
    const fullName = this.dashboard()?.teacherName?.trim() || this.user()?.nombre?.trim() || 'Docente';
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length <= 1) {
      return fullName;
    }
    if (parts.length === 2) {
      return `${parts[0]} ${parts[1]}`;
    }

    return `${parts[0]} ${parts[parts.length - 2]}`;
  });

  readonly quickLinks = computed(() => [
    {
      title: 'Ver horario completo',
      detail: 'Semana actual',
      icon: 'calendar_month',
      tone: 'primary',
      route: '/dashboard/horario'
    },
    {
      title: 'Registrar asistencia',
      detail: 'Clase en curso',
      icon: 'fact_check',
      tone: 'success',
      route: '/dashboard/asistencia'
    },
    {
      title: 'Abrir evaluaciones',
      detail: `${this.dashboard()?.pendingPlanningCount ?? 0} pendientes`,
      icon: 'grading',
      tone: 'warning',
      route: '/dashboard/calificaciónes'
    },
    {
      title: 'Planificaciones',
      detail: 'Crear clase',
      icon: 'description',
      tone: 'accent',
      route: '/dashboard/planificaciones-nuevo'
    },
    {
      title: 'Contenido',
      detail: 'Materiales de clase',
      icon: 'upload_file',
      tone: 'rose',
      route: '/dashboard/contenido'
    }
  ]);

  readonly lifeCourseOptions = computed<StudentLifeCourseOption[]>(() =>
    this.studentLifeOverview()?.courses ?? []
  );

  readonly lifeStudentOptions = computed<StudentLifeListItem[]>(() => {
    const students = this.studentLifeOverview()?.students ?? [];
    const courseId = Number(this.selectedLifeCourseId());
    return Number.isFinite(courseId) && courseId > 0
      ? students.filter((student) => student.courseId === courseId)
      : students;
  });

  readonly teacherInitials = computed(() => {
    const source = this.dashboard()?.teacherName ?? this.user()?.nombre ?? 'Docente';

    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0).toUpperCase())
      .join('');
  });

  constructor() {
    this.loadDashboard();
  }

  openInterviewLauncher(): void {
    this.openLifeLauncher('interview');
  }

  openAnnotationLauncher(): void {
    this.openLifeLauncher('annotation');
  }

  openLifeLauncher(mode: 'interview' | 'annotation'): void {
    this.lifeLauncherMode.set(mode);
    this.ensureSelectedLifeCourse();
    this.selectedLifeEnrollmentId.set('');
    this.lifeLauncherOpen.set(true);
    if (!this.studentLifeOverview()) {
      this.loadStudentLifeOptions();
    }
  }

  closeLifeLauncher(): void {
    this.lifeLauncherOpen.set(false);
  }

  updateLifeCourse(courseId: string): void {
    this.selectedLifeCourseId.set(courseId);
    this.selectedLifeEnrollmentId.set('');
  }

  startDashboardLifeAction(): void {
    const student = this.selectedLifeStudent();
    if (!student) {
      this.snackBar.open('Selecciona un estudiante para continuar', 'Cerrar', { duration: 2600 });
      return;
    }

    this.lifeLauncherOpen.set(false);
    void this.router.navigate(['/dashboard/hoja-vida', student.id], {
      queryParams: { tab: this.lifeLauncherMode() === 'annotation' ? 'Convivencia' : 'Entrevista' }
    });
  }

  private formatTodayHeader(): string {
    const formatter = new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const parts = formatter.formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
    const weekday = this.capitalizeWord(values['weekday'] ?? '');
    const month = values['month'] ?? '';

    return `${weekday}, ${values['day'] ?? ''} de ${month} de ${values['year'] ?? ''}`.trim();
  }

  private capitalizeWord(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private loadDashboard(): void {
    this.isLoading.set(true);

    this.teacherDashboardApiService.getDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        const backendMessage = typeof error.error?.message === 'string' ? error.error.message : '';
        if (backendMessage.toLowerCase().includes('teacher dashboard not found')) {
          this.dashboard.set(this.buildFallbackDashboard());
          return;
        }

        this.snackBar.open(backendMessage || 'No fue posible cargar el dashboard del profesor', 'Cerrar', {
          duration: 3500
        });
      }
    });
  }

  private buildFallbackDashboard(): TeacherDashboard {
    return {
      teacherCode: '',
      teacherName: this.user()?.nombre ?? 'Docente',
      specialty: 'Acceso docente habilitado',
      assignedCoursesCount: 0,
      plannedClassesCount: 0,
      pendingPlanningCount: 0,
      assignedCourses: [],
      weeklySchedule: [],
      todaySchedulePreview: []
    };
  }

  private loadStudentLifeOptions(): void {
    this.isLoadingStudentLife.set(true);
    this.studentLifeApiService.getOverview({
      schoolYear: new Date().getFullYear(),
      page: 0,
      size: 250
    }).subscribe({
      next: (overview) => {
        this.studentLifeOverview.set(overview);
        this.ensureSelectedLifeCourse();
        this.isLoadingStudentLife.set(false);
      },
      error: () => {
        this.isLoadingStudentLife.set(false);
        this.snackBar.open('No fue posible cargar cursos y estudiantes', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private ensureSelectedLifeCourse(): void {
    const courses = this.studentLifeOverview()?.courses ?? [];
    if (courses.length === 0) {
      return;
    }

    const currentCourseId = Number(this.selectedLifeCourseId());
    const hasCurrentCourse = courses.some((course) => course.id === currentCourseId);
    if (!hasCurrentCourse) {
      this.selectedLifeCourseId.set(String(courses[0].id));
    }
  }

  private selectedLifeStudent(): StudentLifeListItem | null {
    const enrollmentId = Number(this.selectedLifeEnrollmentId());
    if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) {
      return null;
    }
    return this.studentLifeOverview()?.students.find((student) => student.id === enrollmentId) ?? null;
  }
}
