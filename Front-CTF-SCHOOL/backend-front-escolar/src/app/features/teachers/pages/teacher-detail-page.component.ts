import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherApiService } from '../../../core/services/teacher-api.service';
import { TeacherDetail } from '../../../core/models/teacher.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';
import { TeacherDeleteDialogComponent } from '../components/teacher-delete-dialog.component';

@Component({
  selector: 'app-teacher-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    TeacherSideMenuComponent
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
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly teacherId = Number(this.route.snapshot.paramMap.get('id'));
  readonly teacher = signal<TeacherDetail | null>(null);
  readonly isLoading = signal(true);
  readonly scheduleByDay = computed(() => {
    const days = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const entries = this.teacher()?.weeklySchedule ?? [];
    return days.map((day) => ({
      day,
      items: entries.filter((item) => item.dayOfWeek === day)
    }));
  });

  constructor() {
    this.loadTeacher();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  editTeacher(): void {
    void this.router.navigate(['/dashboard/profesores', this.teacherId, 'editar']);
  }

  confirmDelete(): void {
    const teacher = this.teacher();
    if (!teacher) {
      return;
    }
    const dialogRef = this.dialog.open(TeacherDeleteDialogComponent, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: { fullName: teacher.fullName }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.teacherApiService.delete(teacher.id).subscribe({
        next: () => {
          this.snackBar.open('Profesor eliminado correctamente', 'Cerrar', { duration: 2600 });
          void this.router.navigate(['/dashboard/profesores']);
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar el profesor')
      });
    });
  }

  initials(fullName: string): string {
    const parts = fullName.split(' ').filter(Boolean);
    return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? ''}`.toUpperCase();
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

