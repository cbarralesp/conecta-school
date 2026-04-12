import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherDashboardApiService } from '../../../core/services/teacher-dashboard-api.service';
import { TeacherDashboard } from '../../../core/models/teacher-dashboard.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    RouterLink,
    MatSnackBarModule,
    MatSidenavModule,
    MatToolbarModule,
    TeacherSideMenuComponent
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly teacherDashboardApiService = inject(TeacherDashboardApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly dashboard = signal<TeacherDashboard | null>(null);
  readonly todayName = this.resolveTodayName();

  readonly cards = computed(() => [
    {
      title: 'Cursos asignados',
      value: this.dashboard()?.assignedCoursesCount ?? 0,
      icon: 'school'
    },
    {
      title: 'Clases planificadas',
      value: this.dashboard()?.plannedClassesCount ?? 0,
      icon: 'calendar_month'
    },
    {
      title: 'Pendientes',
      value: this.dashboard()?.pendingPlanningCount ?? 0,
      icon: 'assignment_late'
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

  readonly nextPlanningItems = computed(() => (this.dashboard()?.planningItems ?? []).slice(0, 4));

  constructor() {
    this.loadDashboard();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PLANIFICADA':
        return 'Planificada';
      case 'EN_REVISION':
        return 'En revision';
      case 'COMPLETADA':
        return 'Completada';
      default:
        return status;
    }
  }

  todayLabel(): string {
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

  todayScheduleCaption(): string {
    if (this.todaySchedule().length === 0) {
      return `${this.todayLabel()} - Sin clases asignadas para la jornada actual`;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const hasUpcoming = this.todaySchedule().some((item) => item.endTime >= currentTime);

    return hasUpcoming
      ? `${this.todayLabel()} - Proximas 2 clases`
      : `${this.todayLabel()} - Ultimas 2 clases del dia`;
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
