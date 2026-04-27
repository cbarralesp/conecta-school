import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { filter } from 'rxjs/operators';
import { Course } from '../../../core/models/course.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-courses-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    RouterLink,
    TeacherModernLayoutComponent
  ],
  templateUrl: './courses-page.component.html',
  styleUrl: './courses-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoursesPageComponent {
  private readonly courseApiService = inject(CourseApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;
  readonly displayedColumns = ['code', 'name', 'letter', 'schoolYear', 'scheduleType', 'students', 'actions'];
  readonly courses = signal<Course[]>([]);
  readonly searchTerm = signal('');
  readonly levelFilter = signal('all');
  readonly scheduleFilter = signal('all');

  readonly summaryCards = computed(() => {
    const courses = this.courses();
    const schoolYears = Array.from(new Set(courses.map((course) => course.schoolYear))).sort((a, b) => b - a);
    const distinctShifts = Array.from(new Set(courses.map((course) => course.scheduleType))).length;
    const totalStudents = courses.reduce((total, course) => total + course.studentCount, 0);

    return [
      {
        label: 'Cursos activos',
        value: courses.length,
        ring: 'ACT',
        icon: 'school',
        tone: 'primary'
      },
      {
        label: 'Ano principal',
        value: schoolYears[0] ?? '-',
        ring: 'ANO',
        icon: 'calendar_month',
        tone: 'success'
      },
      {
        label: 'Jornadas',
        value: distinctShifts,
        ring: 'JRN',
        icon: 'wb_sunny',
        tone: 'warning'
      },
      {
        label: 'Total alumnos',
        value: totalStudents,
        ring: 'ALM',
        icon: 'groups',
        tone: 'rose'
      }
    ];
  });

  readonly filteredCourses = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const level = this.levelFilter();
    const schedule = this.scheduleFilter();

    return this.courses().filter((course) => {
      const matchesSearch = !search
        || course.code.toLowerCase().includes(search)
        || course.name.toLowerCase().includes(search)
        || `${course.name} ${course.letter}`.toLowerCase().includes(search);

      const normalizedLevel = this.normalizeLevel(course.level);
      const normalizedSchedule = this.normalizeSchedule(course.scheduleType);

      const matchesLevel = level === 'all' || normalizedLevel === level;
      const matchesSchedule = schedule === 'all' || normalizedSchedule === schedule;

      return matchesSearch && matchesLevel && matchesSchedule;
    });
  });

  constructor() {
    this.refreshData();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (!event.urlAfterRedirects.startsWith('/dashboard/cursos')) {
          return;
        }

        this.refreshData();
      });
  }

  openEditDialog(course: Course): void {
    void this.router.navigate(['/dashboard/cursos', course.id, 'editar']);
  }

  confirmDelete(course: Course): void {
    const ref = this.snackBar.open(`Eliminar ${course.name}?`, 'Confirmar', { duration: 5000 });
    ref.onAction().subscribe(() => {
      this.courseApiService.delete(course.id).subscribe({
        next: () => {
          this.snackBar.open('Curso eliminado correctamente', 'Cerrar', { duration: 2500 });
          this.refreshData();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar el curso')
      });
    });
  }

  openStudentsDialog(course: Course): void {
    void this.router.navigate(['/dashboard/cursos', course.id, 'alumnos']);
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  updateLevelFilter(value: string): void {
    this.levelFilter.set(value);
  }

  updateScheduleFilter(value: string): void {
    this.scheduleFilter.set(value);
  }

  courseDisplayName(course: Course): string {
    return `${course.name} ${course.letter}`.trim();
  }

  courseLeadLabel(_course: Course): string {
    return 'Jefe de Curso: Por definir';
  }

  courseLevelLabel(course: Course): string {
    return course.level || course.name;
  }

  courseShiftLabel(course: Course): string {
    const schedule = this.normalizeSchedule(course.scheduleType);
    return schedule === 'manana' ? 'Manana' : schedule === 'tarde' ? 'Tarde' : course.scheduleType;
  }

  courseShiftIcon(course: Course): string {
    return this.normalizeSchedule(course.scheduleType) === 'tarde' ? 'dark_mode' : 'light_mode';
  }

  courseShiftClass(course: Course): string {
    return this.normalizeSchedule(course.scheduleType) === 'tarde'
      ? 'shift-badge shift-badge--tarde'
      : 'shift-badge shift-badge--manana';
  }

  courseCapacityTone(course: Course): string {
    const maxCapacity = this.courseMaxCapacity(course);
    const ratio = maxCapacity === 0 ? 0 : course.studentCount / maxCapacity;
    if (ratio >= 1) {
      return 'full';
    }
    if (ratio >= 0.95) {
      return 'warning';
    }
    return '';
  }

  courseCapacityWidth(course: Course): number {
    const maxCapacity = this.courseMaxCapacity(course);
    if (maxCapacity === 0) {
      return 0;
    }
    return Math.min(100, Math.round((course.studentCount / maxCapacity) * 100));
  }

  courseMaxCapacity(course: Course): number {
    return this.normalizeLevel(course.level) === 'media' ? 35 : 30;
  }

  courseIcon(course: Course): string {
    return this.normalizeLevel(course.level) === 'media' ? 'school' : 'child_care';
  }

  courseIconClass(course: Course): string {
    return this.normalizeLevel(course.level) === 'media'
      ? 'course-icon course-icon--media'
      : 'course-icon course-icon--basic';
  }

  private loadCourses(): void {
    this.courseApiService.findAll().subscribe({
      next: (courses) => this.courses.set(courses),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos')
    });
  }

  private refreshData(): void {
    this.loadCourses();
  }

  private normalizeLevel(level: string): string {
    const normalized = (level || '').toLowerCase();
    if (normalized.includes('medio') || normalized.includes('media')) {
      return 'media';
    }
    return 'basico';
  }

  private normalizeSchedule(scheduleType: string): string {
    const normalized = (scheduleType || '').toLowerCase();
    if (normalized.includes('tarde')) {
      return 'tarde';
    }
    return 'manana';
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
