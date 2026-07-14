import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Course, TeacherCatalogItem } from '../../../core/models/course.models';
import { formatCourseLevelLabel, formatScheduleLabel, normalizeCourseDisplayName } from '../../../core/constants/course-levels';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
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
    SummaryMetricCardComponent,
    TeacherModernLayoutComponent
  ],
  templateUrl: './courses-page.component.html',
  styleUrl: './courses-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoursesPageComponent {
  private static readonly SCHOOL_YEARS = [2025, 2026, 2027, 2028] as const;

  private readonly courseApiService = inject(CourseApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;
  readonly displayedColumns = ['code', 'name', 'letter', 'schoolYear', 'scheduleType', 'students', 'actions'];
  readonly courses = signal<Course[]>([]);
  readonly teachers = signal<TeacherCatalogItem[]>([]);
  readonly schoolYears = CoursesPageComponent.SCHOOL_YEARS;
  readonly selectedSchoolYear = signal(this.defaultSchoolYear());
  readonly searchTerm = signal('');
  readonly levelFilter = signal('all');
  readonly scheduleFilter = signal('all');

  readonly summaryCards = computed(() => {
    const schoolYear = Number(this.selectedSchoolYear());
    const courses = this.courses().filter((course) => course.schoolYear === schoolYear);
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
        label: 'Año principal',
        value: schoolYears[0] ?? '-',
        ring: 'A\u00d1O',
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
    const schoolYear = Number(this.selectedSchoolYear());

    return this.courses().filter((course) => {
      const matchesSearch = !search
        || course.code.toLowerCase().includes(search)
        || course.name.toLowerCase().includes(search)
        || `${course.name} ${course.letter}`.toLowerCase().includes(search);

      const normalizedLevel = this.normalizeLevel(course.level);
      const normalizedSchedule = this.normalizeSchedule(course.scheduleType);

      const matchesLevel = level === 'all' || normalizedLevel === level;
      const matchesSchedule = schedule === 'all' || normalizedSchedule === schedule;
      const matchesSchoolYear = course.schoolYear === schoolYear;

      return matchesSearch && matchesLevel && matchesSchedule && matchesSchoolYear;
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

  updateSchoolYear(value: string): void {
    this.selectedSchoolYear.set(value);
  }

  courseDisplayName(course: Course): string {
    return normalizeCourseDisplayName(course.name, course.letter);
  }

  courseLeadLabel(course: Course): string {
    const resolvedTeacher = course.teacherName?.trim() || this.findTeacherName(course.teacherId ?? null);
    return resolvedTeacher
      ? `Profesor jefe: ${resolvedTeacher}`
      : 'Profesor jefe: Por definir';
  }

  courseLevelLabel(course: Course): string {
    return formatCourseLevelLabel(course.level || course.name);
  }

  courseShiftLabel(course: Course): string {
    return formatScheduleLabel(course.scheduleType);
  }

  courseShiftIcon(course: Course): string {
    const schedule = this.normalizeSchedule(course.scheduleType);
    if (schedule === 'tarde') {
      return 'dark_mode';
    }
    if (schedule === 'completa') {
      return 'schedule';
    }
    return 'light_mode';
  }

  courseShiftClass(course: Course): string {
    const schedule = this.normalizeSchedule(course.scheduleType);
    if (schedule === 'tarde') {
      return 'shift-badge shift-badge--tarde';
    }
    if (schedule === 'completa') {
      return 'shift-badge';
    }
    return 'shift-badge shift-badge--manana';
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
    const normalizedLevel = this.normalizeLevel(course.level);
    if (normalizedLevel === 'media') {
      return 35;
    }
    if (normalizedLevel === 'inicial') {
      return 25;
    }
    return 30;
  }

  courseIcon(course: Course): string {
    const normalizedLevel = this.normalizeLevel(course.level);
    if (normalizedLevel === 'media') {
      return 'school';
    }
    if (normalizedLevel === 'inicial') {
      return 'toys';
    }
    return 'child_care';
  }

  courseIconClass(course: Course): string {
    const normalizedLevel = this.normalizeLevel(course.level);
    if (normalizedLevel === 'media') {
      return 'course-icon course-icon--media';
    }
    if (normalizedLevel === 'inicial') {
      return 'course-icon course-icon--primary';
    }
    return 'course-icon course-icon--basic';
  }

  private loadCourses(): void {
    forkJoin({
      courses: this.courseApiService.findAll(),
      teachers: this.courseApiService.searchTeachers('')
    }).subscribe({
      next: ({ courses, teachers }) => {
        this.courses.set(courses);
        this.teachers.set(teachers);
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos')
    });
  }

  private refreshData(): void {
    this.loadCourses();
  }

  private normalizeLevel(level: string): string {
    const normalized = (level || '').toLowerCase();
    if (normalized.includes('prek') || normalized.includes('kinder') || normalized.includes('parv') || normalized.includes('nt1') || normalized.includes('nt2')) {
      return 'inicial';
    }
    if (normalized.includes('medio') || normalized.includes('media')) {
      return 'media';
    }
    if (normalized.includes('basico') || normalized.includes('básico')) {
      return 'basico';
    }
    return 'basico';
  }

  private normalizeSchedule(scheduleType: string): string {
    const normalized = (scheduleType || '').toLowerCase();
    if (normalized.includes('completa')) {
      return 'completa';
    }
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

  private findTeacherName(teacherId: number | null): string {
    if (!teacherId) {
      return '';
    }

    return this.teachers().find((teacher) => teacher.id === teacherId)?.fullName ?? '';
  }

  private defaultSchoolYear(): string {
    const currentYear = new Date().getFullYear();
    return this.schoolYears.includes(currentYear as typeof this.schoolYears[number])
      ? `${currentYear}`
      : `${this.schoolYears[0]}`;
  }
}
