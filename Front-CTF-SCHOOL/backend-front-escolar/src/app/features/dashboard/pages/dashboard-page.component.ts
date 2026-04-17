import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherDashboard } from '../../../core/models/teacher-dashboard.models';
import { TeacherDashboardApiService } from '../../../core/services/teacher-dashboard-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
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
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly dashboard = signal<TeacherDashboard | null>(null);
  readonly todayName = this.resolveTodayName();
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

  readonly todaySchedule = computed(() =>
    (this.dashboard()?.weeklySchedule ?? []).filter((item) => item.dayOfWeek === this.todayName)
  );

  readonly todaySchedulePreview = computed(() => {
    const items = [...this.todaySchedule()].sort((left, right) =>
      left.startTime.localeCompare(right.startTime)
    );

    if (items.length <= 2) {
      return items;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcoming = items.filter((item) => item.endTime >= currentTime);

    if (upcoming.length >= 2) {
      return upcoming.slice(0, 2);
    }

    if (upcoming.length === 1) {
      const previous = items.filter((item) => item.endTime < currentTime).slice(-1);
      return [...previous, ...upcoming];
    }

    return items.slice(-2);
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
      title: 'Ingresar calificaciones',
      detail: `${this.dashboard()?.pendingPlanningCount ?? 0} pendientes`,
      icon: 'grading',
      tone: 'warning',
      route: '/dashboard/calificaciones'
    },
    {
      title: 'Planificacion',
      detail: 'Crear clase',
      icon: 'description',
      tone: 'accent',
      route: '/dashboard/planificacion'
    },
    {
      title: 'Subir documentos',
      detail: 'Materiales de clase',
      icon: 'upload_file',
      tone: 'rose',
      route: '/dashboard/planificacion/documentos'
    }
  ]);

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

  todayScheduleCaption(): string {
    if (this.todaySchedule().length === 0) {
      return `${this.todayLabel()} · Sin clases asignadas para la jornada actual`;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const hasUpcoming = this.todaySchedule().some((item) => item.endTime >= currentTime);

    return hasUpcoming
      ? `${this.todayLabel()} · Proximas 2 clases del dia`
      : `${this.todayLabel()} · Ultimas 2 clases del dia`;
  }

  private todayLabel(): string {
    switch (this.todayName) {
      case 'LUNES':
        return 'Lunes';
      case 'MARTES':
        return 'Martes';
      case 'MIERCOLES':
        return 'Miercoles';
      case 'JUEVES':
        return 'Jueves';
      case 'VIERNES':
        return 'Viernes';
      default:
        return 'Hoy';
    }
  }

  private resolveTodayName(): string {
    const day = new Date().getDay();
    switch (day) {
      case 1:
        return 'LUNES';
      case 2:
        return 'MARTES';
      case 3:
        return 'MIERCOLES';
      case 4:
        return 'JUEVES';
      case 5:
        return 'VIERNES';
      default:
        return 'LUNES';
    }
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
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar el dashboard del profesor',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }
}
