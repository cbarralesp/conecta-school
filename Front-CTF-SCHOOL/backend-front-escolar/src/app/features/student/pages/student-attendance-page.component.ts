import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StudentAttendanceDetail } from '../../../core/models/student.models';
import { AuthService } from '../../../core/services/auth.service';
import { StudentApiService } from '../../../core/services/student-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-student-attendance-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './student-attendance-page.component.html',
  styleUrl: './student-attendance-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAttendancePageComponent {
  private readonly authService = inject(AuthService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(true);
  readonly attendance = signal<StudentAttendanceDetail | null>(null);
  readonly studentSearch = signal('');

  readonly welcomeInitial = computed(() => this.attendance()?.header.studentName.charAt(0).toUpperCase() ?? 'A');
  readonly cards = computed(() => {
    const detail = this.attendance();
    if (!detail) {
      return [];
    }

    return [
      {
        title: 'Asistencia general',
        value: `${detail.summary.percentage}%`,
        caption: `${detail.summary.totalRecords} registro(s) acumulados`,
        tone: 'brand',
        icon: 'fact_check'
      },
      {
        title: 'Presentes',
        value: detail.summary.presentCount,
        caption: 'Asistencias confirmadas',
        tone: 'success',
        icon: 'check_circle'
      },
      {
        title: 'Atrasos',
        value: detail.summary.lateCount,
        caption: 'Llegadas registradas tarde',
        tone: 'warning',
        icon: 'schedule'
      },
      {
        title: 'Ausencias',
        value: detail.summary.absentCount,
        caption: 'Inasistencias registradas',
        tone: 'danger',
        icon: 'event_busy'
      }
    ];
  });
  readonly recentRecords = computed(() => this.attendance()?.recentRecords.slice(0, 5) ?? []);

  constructor() {
    this.loadAttendance();
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  badgeClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'PRESENTE':
        return 'is-success';
      case 'ATRASO':
      case 'ATRASADO':
        return 'is-warning';
      case 'AUSENTE':
        return 'is-danger';
      default:
        return 'is-neutral';
    }
  }

  dotClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'PRESENTE':
        return 'dot-success';
      case 'ATRASO':
      case 'ATRASADO':
        return 'dot-warning';
      case 'AUSENTE':
        return 'dot-danger';
      default:
        return 'dot-neutral';
    }
  }

  showWeekStatusLabel(status: string): boolean {
    return !['PRESENTE', 'PRESENT'].includes(status.toUpperCase());
  }

  private loadAttendance(): void {
    this.isLoading.set(true);
    this.studentApiService.getStudentAttendance().subscribe({
      next: (attendance) => {
        this.attendance.set(attendance);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
        : 'No fue posible cargar la asistencia del estudiante',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }
}
