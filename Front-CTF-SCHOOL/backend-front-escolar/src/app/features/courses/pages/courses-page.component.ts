import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Course, CoursePayload } from '../../../core/models/course.models';
import { CourseApiService } from '../../../core/services/course-api.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';
import { CourseDialogComponent } from '../components/course-dialog.component';

@Component({
  selector: 'app-courses-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatToolbarModule,
    RouterLink,
    TeacherSideMenuComponent
  ],
  templateUrl: './courses-page.component.html',
  styleUrl: './courses-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoursesPageComponent {
  private readonly courseApiService = inject(CourseApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly displayedColumns = ['code', 'name', 'level', 'letter', 'schoolYear', 'scheduleType', 'actions'];
  readonly courses = signal<Course[]>([]);
  readonly summaryCards = computed(() => {
    const courses = this.courses();
    const schoolYears = Array.from(new Set(courses.map((course) => course.schoolYear))).sort((a, b) => b - a);
    return [
      {
        label: 'Cursos activos',
        value: courses.length,
        hint: 'Disponibles para gestion'
      },
      {
        label: 'Año principal',
        value: schoolYears[0] ?? '-',
        hint: 'Periodo mas reciente'
      },
      {
        label: 'Jornadas',
        value: Array.from(new Set(courses.map((course) => course.scheduleType))).length,
        hint: 'Manana, tarde o mixta'
      }
    ];
  });

  constructor() {
    this.loadCourses();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CourseDialogComponent, {
      width: '920px',
      maxWidth: '84vw',
      maxHeight: '88vh',
      autoFocus: false,
      panelClass: 'course-dialog-panel'
    });
    dialogRef.afterClosed().subscribe((payload?: CoursePayload) => {
      if (!payload) {
        return;
      }

      this.courseApiService.create(payload).subscribe({
        next: () => {
          this.snackBar.open('Curso creado correctamente', 'Cerrar', { duration: 2500 });
          this.loadCourses();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible crear el curso')
      });
    });
  }

  openEditDialog(course: Course): void {
    const dialogRef = this.dialog.open(CourseDialogComponent, {
      data: { course },
      width: '920px',
      maxWidth: '84vw',
      maxHeight: '88vh',
      autoFocus: false,
      panelClass: 'course-dialog-panel'
    });
    dialogRef.afterClosed().subscribe((payload?: CoursePayload) => {
      if (!payload) {
        return;
      }

      this.courseApiService.update(course.id, payload).subscribe({
        next: () => {
          this.snackBar.open('Curso actualizado correctamente', 'Cerrar', { duration: 2500 });
          this.loadCourses();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible actualizar el curso')
      });
    });
  }

  confirmDelete(course: Course): void {
    const ref = this.snackBar.open(`Eliminar ${course.name}?`, 'Confirmar', { duration: 5000 });
    ref.onAction().subscribe(() => {
      this.courseApiService.delete(course.id).subscribe({
        next: () => {
          this.snackBar.open('Curso eliminado correctamente', 'Cerrar', { duration: 2500 });
          this.loadCourses();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar el curso')
      });
    });
  }

  private loadCourses(): void {
    this.courseApiService.findAll().subscribe({
      next: (courses) => this.courses.set(courses),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos')
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
