import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  PlanningClass,
  PlanningUnitCatalogAssignment,
  PlanningSummary,
  PlanningSummaryMetrics
} from '../../../core/models/planning.models';
import { Course } from '../../../core/models/course.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type SemesterFilter = 'all' | '1' | '2';
type MonthFilter = 'all' | `${number}`;

@Component({
  selector: 'app-planning-overview-page',
  imports: [
    RouterLink,
    MatIconModule,
    MatPaginatorModule,
    MatSnackBarModule,
    SummaryMetricCardComponent,
    TeacherModernLayoutComponent
  ],
  templateUrl: './planning-overview-page.component.html',
  styleUrl: './planning-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningOverviewPageComponent {
  private readonly planningApiService = inject(PlanningApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly courseApiService = inject(CourseApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly dashboard = signal<PlanningSummary | null>(null);
  readonly classes = signal<PlanningClass[]>([]);
  readonly courses = signal<Course[]>([]);
  readonly assignments = signal<PlanningUnitCatalogAssignment[]>([]);
  readonly search = signal('');
  readonly semester = signal<SemesterFilter>('all');
  readonly month = signal<MonthFilter>('all');
  readonly courseId = signal<'all' | number>('all');
  readonly subjectId = signal<'all' | number>('all');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly selectedPlanningClass = signal<PlanningClass | null>(null);

  readonly months = [
    { value: 'all', label: 'Todos los meses' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ] as const;

  readonly metrics = computed<PlanningSummaryMetrics>(() =>
    this.dashboard()?.summary ?? {
      totalUnits: 0,
      totalClasses: 0,
      publishedClasses: 0,
      totalDocuments: 0,
      visibleDocuments: 0,
      semesterProgressPercent: 0
    }
  );

  readonly semesterLabel = computed(() =>
    this.semester() === '1'
      ? 'Primer Semestre'
      : this.semester() === '2' ? 'Segundo Semestre' : 'Todos los semestres'
  );

  readonly hasClasses = computed(() => this.classes().length > 0);
  readonly totalItems = computed(() => this.classes().length);
  readonly pagedClasses = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.classes().slice(start, start + this.pageSize());
  });
  readonly shouldShowPaginator = computed(() => this.totalItems() > this.pageSize());
  readonly courseOptions = computed(() => {
    return this.courses().map((course) => ({
      id: course.id,
      name: course.letter ? `${course.name} ${course.letter}` : course.name
    }));
  });
  readonly subjects = computed(() => {
    const selectedCourseId = this.courseId();
    const subjects = new Map<number, string>();
    for (const assignment of this.assignments()) {
      if (selectedCourseId !== 'all' && assignment.courseId !== selectedCourseId) {
        continue;
      }
      if (!subjects.has(assignment.subjectId)) {
        subjects.set(assignment.subjectId, assignment.subjectName);
      }
    }

    return Array.from(subjects.entries()).map(([id, name]) => ({ id, name }));
  });

  constructor() {
    this.loadCourses();
    this.loadAssignments();
    this.loadPage();
  }

  updateSearch(value: string): void {
    this.search.set(value);
    this.resetPage();
    this.loadClasses();
  }

  updateSemester(value: string): void {
    this.semester.set((value as SemesterFilter) || 'all');
    this.resetPage();
    this.loadPage();
  }

  updateMonth(value: string): void {
    this.month.set((value as MonthFilter) || 'all');
    this.resetPage();
    this.loadPage();
  }

  updateCourse(value: string): void {
    this.courseId.set(value === 'all' ? 'all' : Number(value));
    const hasSelectedSubject = this.subjects().some((subject) => subject.id === this.subjectId());
    if (!hasSelectedSubject) {
      this.subjectId.set('all');
    }
    this.resetPage();
    this.loadPage();
  }

  updateSubject(value: string): void {
    this.subjectId.set(value === 'all' ? 'all' : Number(value));
    this.resetPage();
    this.loadPage();
  }

  handlePageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  openView(planningClass: PlanningClass): void {
    this.selectedPlanningClass.set(planningClass);
  }

  closeView(): void {
    this.selectedPlanningClass.set(null);
  }

  printView(): void {
    window.print();
  }

  deleteClass(planningClass: PlanningClass): void {
    const confirmed = window.confirm(`¿Eliminar la planificación "${planningClass.title}"? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    this.planningApiService.deleteClass(planningClass.id).subscribe({
      next: () => {
        this.snackBar.open('Planificación eliminada correctamente', 'Cerrar', { duration: 2800 });
        this.loadPage();
      },
      error: (error: HttpErrorResponse) => {
        this.showError(error, 'No fue posible eliminar la planificación');
      }
    });
  }

  statusLabel(status: PlanningClass['status']): string {
    return status === 'PUBLICADA' ? 'Programada' : 'Borrador';
  }

  statusClass(status: PlanningClass['status']): string {
    return status === 'PUBLICADA' ? 'status-scheduled' : 'status-draft';
  }

  formatClassDate(value: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    }).format(new Date(`${value}T00:00:00`));
  }

  formatFullClassDate(value: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${value}T00:00:00`));
  }

  subjectIcon(subjectName: string): string {
    const normalized = subjectName.toLowerCase();
    if (normalized.includes('arte')) {
      return 'palette';
    }
    if (normalized.includes('lenguaje')) {
      return 'menu_book';
    }
    if (normalized.includes('matemat')) {
      return 'calculate';
    }
    if (normalized.includes('ciencia')) {
      return 'science';
    }
    return 'auto_stories';
  }

  private loadPage(): void {
    this.isLoading.set(true);
    this.loadSummary();
    this.loadClasses();
  }

  private loadSummary(): void {
    this.planningApiService
      .getPlanningSummary(this.buildFilters())
      .subscribe({
        next: (summary) => {
          this.dashboard.set(summary);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.showError(error, 'No fue posible cargar el resumen de planificaciones');
        }
      });
  }

  private loadClasses(): void {
    this.planningApiService
      .getClasses({
        courseId: this.selectedCourseId(),
        subjectId: this.selectedSubjectId(),
        semester: this.semester() === 'all' ? undefined : Number(this.semester()),
        month: this.month() === 'all' ? undefined : Number(this.month()),
        search: this.search()
      })
      .subscribe({
        next: (classes) => {
          this.classes.set(classes);
          const maxPageIndex = Math.max(Math.ceil(classes.length / this.pageSize()) - 1, 0);
          if (this.pageIndex() > maxPageIndex) {
            this.pageIndex.set(0);
          }
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.showError(error, 'No fue posible cargar las clases planificadas');
        }
      });
  }

  private buildFilters(): {
    courseId?: number;
    subjectId?: number;
    semester?: number;
    month?: number;
  } {
    return {
      courseId: this.selectedCourseId(),
      subjectId: this.selectedSubjectId(),
      semester: this.semester() === 'all' ? undefined : Number(this.semester()),
      month: this.month() === 'all' ? undefined : Number(this.month())
    };
  }

  private selectedSubjectId(): number | undefined {
    const subjectId = this.subjectId();
    return subjectId === 'all' ? undefined : subjectId;
  }

  private selectedCourseId(): number | undefined {
    const courseId = this.courseId();
    return courseId === 'all' ? undefined : courseId;
  }

  private loadAssignments(): void {
    this.planningApiService.getUnitCatalogs().subscribe({
      next: (catalogs) => this.assignments.set(catalogs.teachingAssignments),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos de planificacion')
    });
  }

  private loadCourses(): void {
    this.courseApiService.findAll().subscribe({
      next: (courses) => this.courses.set(courses.filter((course) => course.active)),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos')
    });
  }

  private resetPage(): void {
    this.pageIndex.set(0);
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
