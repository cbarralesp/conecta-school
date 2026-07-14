import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, forkJoin, of, pairwise, startWith, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';
import { EnrollmentDetail, EnrollmentListItem, EnrollmentOverview, EnrollmentPagination, EnrollmentSummary } from '../../../core/models/enrollment.models';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

@Component({
  selector: 'app-enrollments-page',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatTableModule,
    SummaryMetricCardComponent,
    TeacherModernLayoutComponent
  ],
  templateUrl: './enrollments-page.component.html',
  styleUrl: './enrollments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentsPageComponent {
  private static readonly PAGE_SIZE = 10;
  private static readonly SCHOOL_YEARS = [2025, 2026, 2027, 2028] as const;

  private readonly formBuilder = inject(FormBuilder);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;
  readonly displayedColumns = ['student', 'course', 'enrollmentDate', 'guardian', 'status', 'actions'];
  readonly overview = signal<EnrollmentOverview | null>(null);
  readonly isLoading = signal(true);
  readonly isExporting = signal(false);
  readonly isRenewalOpen = signal(false);
  readonly isLoadingRenewalCandidates = signal(false);
  readonly isLoadingRenewalDetail = signal(false);
  readonly isRenewing = signal(false);
  readonly pageIndex = signal(0);
  readonly schoolYears = EnrollmentsPageComponent.SCHOOL_YEARS;
  readonly renewalSteps = [
    { number: 1, label: 'Alumno' },
    { number: 2, label: 'Apoderado' },
    { number: 3, label: 'Curso' },
    { number: 4, label: 'Confirmar' }
  ];
  readonly renewalStep = signal(1);
  readonly renewalSelectedEnrollmentId = signal<number | null>(null);
  readonly renewalDetail = signal<EnrollmentDetail | null>(null);
  readonly renewalSearch = signal('');
  readonly renewalTargetYear = signal('2027');
  readonly renewalTargetBaseName = signal('3 Básico');
  readonly renewalTargetLevel = signal('Básico');
  readonly renewalTargetLetter = signal('A');
  readonly renewalTargetSchedule = signal('Manana');
  readonly renewalTargetCourseId = signal('');
  readonly renewalTargetCourseOptions = signal<EnrollmentOverview['courses']>([]);
  readonly isLoadingRenewalTargetCourses = signal(false);
  readonly renewalDate = signal(this.todayDate());
  readonly renewalSourceYear = signal(this.defaultSchoolYear());
  readonly renewalSourceCourseId = signal('');
  readonly renewalItems = signal<EnrollmentListItem[]>([]);
  readonly renewalCourseOptions = signal<EnrollmentOverview['courses']>([]);
  readonly renewalTargetStudentIds = signal<Set<number>>(new Set());
  readonly filtersForm = this.formBuilder.nonNullable.group({
    schoolYear: [this.defaultSchoolYear()],
    search: [''],
    courseId: [''],
    status: ['']
  });

  readonly summary = computed<EnrollmentSummary>(() => this.overview()?.summary ?? {
    total: 0,
    active: 0,
    pending: 0,
    courses: 0
  });
  readonly pagination = computed<EnrollmentPagination>(() => this.overview()?.pagination ?? {
    page: 0,
    size: this.pageSize,
    totalItems: 0,
    totalPages: 0
  });
  readonly enrollments = computed<EnrollmentListItem[]>(() => this.overview()?.enrollments ?? []);
  readonly pageSize = EnrollmentsPageComponent.PAGE_SIZE;
  readonly totalItems = computed(() => this.pagination().totalItems);
  readonly pagedEnrollments = computed(() => this.enrollments());
  readonly shouldShowPaginator = computed(() => this.totalItems() > this.pageSize);
  readonly renewalCandidates = computed(() => {
    const search = this.renewalSearch().trim().toUpperCase();
    const targetStudentIds = this.renewalTargetStudentIds();
    return this.renewalItems().filter((item) => {
      if (targetStudentIds.has(item.studentId)) {
        return false;
      }

      if (!search) {
        return true;
      }

      return `${item.fullName} ${item.studentRun} ${item.courseName}`.toUpperCase().includes(search);
    });
  });
  readonly selectedRenewalEnrollment = computed(() => {
    const selectedId = this.renewalSelectedEnrollmentId();
    return this.renewalItems().find((item) => item.id === selectedId) ?? null;
  });

  constructor() {
    this.loadOverview();
    this.filtersForm.valueChanges
      .pipe(
        startWith(this.filtersForm.getRawValue()),
        debounceTime(250),
        pairwise(),
        distinctUntilChanged(([previousA, currentA], [previousB, currentB]) =>
          JSON.stringify(previousA) === JSON.stringify(previousB) && JSON.stringify(currentA) === JSON.stringify(currentB)
        )
      )
      .subscribe(([previous, current]) => {
        if (previous.schoolYear !== current.schoolYear && current.courseId !== '') {
          this.filtersForm.controls.courseId.setValue('', { emitEvent: false });
        }
        this.pageIndex.set(0);
        this.loadOverview();
      });

    effect(() => {
      const pagination = this.pagination();
      const currentPage = this.pageIndex();
      const maxPageIndex = Math.max(pagination.totalPages - 1, 0);

      if (pagination.totalItems > 0 && currentPage > maxPageIndex) {
        this.pageIndex.set(maxPageIndex);
        this.loadOverview();
      }
    });
  }

  goToCreate(): void {
    void this.router.navigate(['/dashboard/matriculas/nueva']);
  }

  openRenewalPrototype(): void {
    const currentSchoolYear = this.defaultSchoolYear();
    this.isRenewalOpen.set(true);
    this.renewalStep.set(1);
    this.renewalSelectedEnrollmentId.set(null);
    this.renewalDetail.set(null);
    this.renewalSearch.set('');
    this.renewalSourceYear.set(currentSchoolYear);
    this.renewalSourceCourseId.set('');
    this.renewalTargetYear.set(this.nextSchoolYearValue(this.renewalSourceYear()));
    this.clearRenewalTargetCourse();
    this.renewalDate.set(this.todayDate());
    this.loadRenewalCandidates();
    this.loadRenewalTargetCourses();
  }

  closeRenewal(): void {
    if (this.isRenewing()) {
      return;
    }

    this.isRenewalOpen.set(false);
  }

  selectRenewalCandidate(item: EnrollmentListItem): void {
    if (this.isStudentAlreadyRenewed(item)) {
      this.snackBar.open(
        `${item.fullName} ya tiene matrícula activa para el año ${this.renewalTargetYear()}`,
        'Cerrar',
        { duration: 3200 }
      );
      return;
    }

    this.renewalSelectedEnrollmentId.set(item.id);
    this.prefillRenewalCourse(item);
    this.loadRenewalDetail(item.id);
  }

  goToRenewalStep(step: number): void {
    if (this.canNavigateRenewalStep(step)) {
      this.renewalStep.set(step);
    }
  }

  previousRenewalStep(): void {
    this.renewalStep.set(Math.max(1, this.renewalStep() - 1));
  }

  nextRenewalStep(): void {
    if (this.renewalStep() === 1 && this.renewalSelectedEnrollmentId() == null) {
      this.snackBar.open('Selecciona un alumno para continuar', 'Cerrar', { duration: 2400 });
      return;
    }

    if (this.renewalStep() === 3 && !this.hasRenewalCourseSelection()) {
      this.snackBar.open('Selecciona un curso existente para matricular', 'Cerrar', { duration: 2600 });
      return;
    }

    if (this.renewalStep() < 4) {
      this.renewalStep.set(this.renewalStep() + 1);
    }
  }

  canNavigateRenewalStep(step: number): boolean {
    if (step <= this.renewalStep()) {
      return true;
    }

    if (step === 2) {
      return this.renewalSelectedEnrollmentId() != null;
    }

    return this.renewalSelectedEnrollmentId() != null && this.renewalDetail() != null;
  }

  isRenewalStepCompleted(step: number): boolean {
    if (step === 1) {
      return this.renewalSelectedEnrollmentId() != null;
    }

    if (step === 2) {
      return this.renewalDetail() != null;
    }

    if (step === 3) {
      return this.hasRenewalCourseSelection();
    }

    return false;
  }

  isRenewalStepActive(step: number): boolean {
    return this.renewalStep() === step;
  }

  updateRenewalSourceYear(value: string): void {
    this.renewalSourceYear.set(value);
    this.renewalSourceCourseId.set('');
    this.renewalSelectedEnrollmentId.set(null);
    this.renewalDetail.set(null);
    this.renewalTargetYear.set(this.nextSchoolYearValue(value));
    this.loadRenewalCandidates();
    this.loadRenewalTargetCourses();
  }

  updateRenewalSourceCourse(value: string): void {
    this.renewalSourceCourseId.set(value);
    this.renewalSelectedEnrollmentId.set(null);
    this.renewalDetail.set(null);
    const selectedCourse = this.renewalCourseOptions().find((course) => `${course.id}` === value);
    if (selectedCourse) {
      this.prefillRenewalTargetCourse(selectedCourse.name, selectedCourse.letter);
    }
    this.loadRenewalCandidates();
  }

  updateRenewalTargetYear(value: string): void {
    this.renewalTargetYear.set(value);
    this.clearRenewalTargetCourse();
    this.loadRenewalTargetCourses();
  }

  updateRenewalTargetCourse(value: string): void {
    this.renewalTargetCourseId.set(value);
    const selectedCourse = this.renewalTargetCourseOptions().find((course) => `${course.id}` === value);
    if (selectedCourse) {
      this.applyRenewalTargetCourse(selectedCourse);
    }
  }

  submitRenewal(): void {
    const selectedId = this.renewalSelectedEnrollmentId();
    if (selectedId == null || !this.hasRenewalCourseSelection()) {
      this.snackBar.open('Completa los datos de renovacion antes de confirmar', 'Cerrar', { duration: 2600 });
      return;
    }

    const selectedEnrollment = this.selectedRenewalEnrollment();
    if (selectedEnrollment && this.isStudentAlreadyRenewed(selectedEnrollment)) {
      this.snackBar.open(
        `${selectedEnrollment.fullName} ya esta matriculado en el año ${this.renewalTargetYear()}`,
        'Cerrar',
        { duration: 3200 }
      );
      return;
    }

    this.isRenewing.set(true);
    this.enrollmentApiService.renew(selectedId, {
      courseId: Number(this.renewalTargetCourseId()),
      enrollmentDate: this.renewalDate(),
      courseSelection: {
        baseName: this.renewalTargetBaseName(),
        level: this.renewalTargetLevel(),
        letter: this.renewalTargetLetter(),
        schoolYear: this.renewalTargetYear(),
        scheduleType: this.renewalTargetSchedule()
      }
    }).subscribe({
      next: () => {
        const targetYear = this.renewalTargetYear();
        this.isRenewing.set(false);
        this.isRenewalOpen.set(false);
        this.snackBar.open('Matricula renovada correctamente', 'Cerrar', { duration: 2600 });
        this.filtersForm.controls.schoolYear.setValue(targetYear, { emitEvent: false });
        this.pageIndex.set(0);
        this.loadOverview();
      },
      error: (error: HttpErrorResponse) => {
        this.isRenewing.set(false);
        this.showError(error, 'No fue posible renovar la matricula');
      }
    });
  }

  courseFilterLabel(course: EnrollmentOverview['courses'][number]): string {
    return course.name;
  }

  exportJson(): void {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    const currentFilters = {
      schoolYear: this.selectedSchoolYear(),
      search: this.filtersForm.controls.search.value,
      courseId: this.selectedCourseId(),
      status: this.filtersForm.controls.status.value || null
    };

    this.enrollmentApiService.getOverview({
      ...currentFilters,
      page: 0,
      size: Math.max(this.totalItems(), this.pageSize, 1)
    }).pipe(
      switchMap((overview) => {
        if (overview.enrollments.length === 0) {
          return of({ overview, details: [] as EnrollmentDetail[] });
        }

        return forkJoin(
          overview.enrollments.map((item) => this.enrollmentApiService.getById(item.id))
        ).pipe(
          switchMap((details) => of({ overview, details }))
        );
      })
    ).subscribe({
      next: ({ overview, details }) => {
        if (details.length === 0) {
          this.isExporting.set(false);
          this.snackBar.open('No hay matrículas para exportar con los filtros actuales', 'Cerrar', {
            duration: 2800
          });
          return;
        }

        const exportPayload = {
          generatedAt: new Date().toISOString(),
          generatedBy: this.user()?.nombre ?? 'Usuario',
          filters: {
            schoolYear: currentFilters.schoolYear || 'TODOS',
            search: currentFilters.search?.trim() || '',
            status: currentFilters.status || 'TODOS'
          },
          summary: overview.summary,
          totalRecords: details.length,
          enrollments: details
        };

        this.downloadJsonFile(exportPayload);
        this.isExporting.set(false);
        this.snackBar.open('JSON descargado correctamente', 'Cerrar', {
          duration: 2400
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isExporting.set(false);
        this.showError(error, 'No fue posible exportar las matrículas en JSON');
      }
    });
  }

  exportPlaceholder(format: 'excel' | 'word' | 'pdf'): void {
    const label = format.toUpperCase();
    this.snackBar.open(`${label} estará disponible próximamente. Por ahora puedes usar JSON.`, 'Cerrar', {
      duration: 2800
    });
  }

  goToDetail(enrollmentId: number): void {
    void this.router.navigate(['/dashboard/matriculas', enrollmentId]);
  }

  goToEdit(enrollmentId: number): void {
    void this.router.navigate(['/dashboard/matriculas', enrollmentId, 'editar']);
  }

  confirmDelete(item: EnrollmentListItem): void {
    const isInactive = this.isInactive(item.status);
    const ref = this.snackBar.open(
      isInactive
        ? `Eliminar definitivamente la matrícula de ${item.fullName}?`
        : `Inactivar matrícula de ${item.fullName}?`,
      'Confirmar',
      {
      duration: 5000
      }
    );
    ref.onAction().subscribe(() => {
      this.enrollmentApiService.delete(item.id).subscribe({
        next: () => {
          this.snackBar.open(
            isInactive ? 'Matricula eliminada correctamente' : 'Matricula inactivada correctamente',
            'Cerrar',
            { duration: 2500 }
          );
          this.loadOverview();
        },
        error: (error: HttpErrorResponse) => this.showError(
          error,
          isInactive ? 'No fue posible eliminar la matricula' : 'No fue posible inactivar la matricula'
        )
      });
    });
  }

  reactivateEnrollment(item: EnrollmentListItem): void {
    const ref = this.snackBar.open(`Reactivar matrícula de ${item.fullName}?`, 'Confirmar', {
      duration: 5000
    });
    ref.onAction().subscribe(() => {
      this.enrollmentApiService.reactivate(item.id).subscribe({
        next: () => {
          this.snackBar.open('Matricula reactivada correctamente', 'Cerrar', { duration: 2500 });
          this.loadOverview();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible reactivar la matricula')
      });
    });
  }

  initials(item: EnrollmentListItem): string {
    return `${item.studentName.charAt(0)}${item.studentLastName.charAt(0)}`.toUpperCase();
  }

  formatEnrollmentDate(value: string): string {
    if (!value) {
      return '-';
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      return value;
    }

    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  handlePageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.loadOverview();
  }

  isInactive(status: string): boolean {
    return ['INACTIVA', 'INACTIVO'].includes(`${status ?? ''}`.trim().toUpperCase());
  }

  formatFullName(detail: EnrollmentDetail | null): string {
    if (!detail) {
      return '';
    }

    return `${detail.studentName} ${detail.studentLastName}`.trim();
  }

  private loadRenewalDetail(enrollmentId: number): void {
    this.isLoadingRenewalDetail.set(true);
    this.enrollmentApiService.getById(enrollmentId).subscribe({
      next: (detail) => {
        this.renewalDetail.set(detail);
        this.isLoadingRenewalDetail.set(false);
        this.renewalStep.set(2);
      },
      error: (error: HttpErrorResponse) => {
        this.renewalDetail.set(null);
        this.isLoadingRenewalDetail.set(false);
        this.showError(error, 'No fue posible cargar la ficha del alumno');
      }
    });
  }

  private loadRenewalCandidates(): void {
    this.isLoadingRenewalCandidates.set(true);
    this.renewalItems.set([]);
    this.enrollmentApiService.getOverview({
      schoolYear: this.selectedRenewalSourceYear(),
      courseId: this.selectedRenewalCourseId(),
      status: 'ACTIVO',
      page: 0,
      size: Math.max(this.totalItems(), this.pageSize, 100)
    }).subscribe({
      next: (overview) => {
        this.renewalCourseOptions.set(overview.courses);
        const selectedCourse = overview.courses.find((course) => `${course.id}` === this.renewalSourceCourseId());
        if (selectedCourse && this.renewalSelectedEnrollmentId() == null) {
          this.prefillRenewalTargetCourse(selectedCourse.name, selectedCourse.letter);
        }
        this.renewalItems.set(overview.enrollments);
        this.syncRenewalSelectionWithTargetEnrollments();
        this.isLoadingRenewalCandidates.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.renewalCourseOptions.set([]);
        this.renewalItems.set([]);
        this.isLoadingRenewalCandidates.set(false);
        this.showError(error, 'No fue posible cargar los alumnos para renovar');
      }
    });
  }

  private loadRenewalTargetCourses(): void {
    this.isLoadingRenewalTargetCourses.set(true);
    this.renewalTargetCourseOptions.set([]);
    this.renewalTargetStudentIds.set(new Set());
    this.enrollmentApiService.getOverview({
      schoolYear: this.selectedRenewalTargetYear(),
      status: 'ACTIVO',
      page: 0,
      size: 10000
    }).subscribe({
      next: (overview) => {
        this.renewalTargetCourseOptions.set(overview.courses);
        this.renewalTargetStudentIds.set(new Set(overview.enrollments.map((item) => item.studentId)));
        this.applyRenewalSuggestionFromCurrentSelection(overview.courses);
        this.syncRenewalSelectionWithTargetEnrollments();
        this.isLoadingRenewalTargetCourses.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.renewalTargetCourseOptions.set([]);
        this.renewalTargetStudentIds.set(new Set());
        this.isLoadingRenewalTargetCourses.set(false);
        this.showError(error, 'No fue posible cargar los cursos del año destino');
      }
    });
  }

  private applyRenewalSuggestionFromCurrentSelection(courses: EnrollmentOverview['courses']): void {
    const selectedEnrollment = this.selectedRenewalEnrollment();
    const selectedSourceCourse = selectedEnrollment
      ? { name: selectedEnrollment.courseName, letter: this.courseLetterFromName(selectedEnrollment.courseName) }
      : this.renewalCourseOptions().find((course) => `${course.id}` === this.renewalSourceCourseId());

    if (!selectedSourceCourse) {
      return;
    }

    const suggestedCourse = this.findPromotedCourseOption(courses, selectedSourceCourse.name, selectedSourceCourse.letter);
    if (suggestedCourse) {
      this.renewalTargetCourseId.set(`${suggestedCourse.id}`);
      this.applyRenewalTargetCourse(suggestedCourse);
      return;
    }

    this.clearRenewalTargetCourse();
  }

  private loadOverview(): void {
    this.isLoading.set(true);
    this.enrollmentApiService.getOverview({
      schoolYear: this.selectedSchoolYear(),
      search: this.filtersForm.controls.search.value,
      courseId: this.selectedCourseId(),
      status: this.filtersForm.controls.status.value || null,
      page: this.pageIndex(),
      size: this.pageSize
    }).subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.overview.set(null);
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar las matriculas');
      }
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private isStudentAlreadyRenewed(item: EnrollmentListItem): boolean {
    return this.renewalTargetStudentIds().has(item.studentId);
  }

  private syncRenewalSelectionWithTargetEnrollments(): void {
    const selected = this.selectedRenewalEnrollment();
    if (!selected || !this.isStudentAlreadyRenewed(selected)) {
      return;
    }

    this.renewalSelectedEnrollmentId.set(null);
    this.renewalDetail.set(null);
    if (this.renewalStep() > 1) {
      this.renewalStep.set(1);
    }
  }

  private downloadJsonFile(payload: unknown): void {
    const fileName = this.buildExportFileName();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private buildExportFileName(): string {
    const now = new Date();
    const date = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
    const schoolYear = this.selectedSchoolYear();
    return schoolYear
      ? `matriculas-${schoolYear}-export-${date}.json`
      : `matriculas-export-${date}.json`;
  }

  private selectedCourseId(): number | null {
    const value = this.filtersForm.controls.courseId.value.trim();
    if (!value) {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }

  private selectedSchoolYear(): number | null {
    const value = this.filtersForm.controls.schoolYear.value.trim();
    return this.parseNumberFilter(value);
  }

  private selectedRenewalSourceYear(): number | null {
    return this.parseNumberFilter(this.renewalSourceYear());
  }

  private selectedRenewalCourseId(): number | null {
    const numericValue = this.parseNumberFilter(this.renewalSourceCourseId());
    return numericValue != null && numericValue > 0 ? numericValue : null;
  }

  private selectedRenewalTargetYear(): number | null {
    return this.parseNumberFilter(this.renewalTargetYear());
  }

  private parseNumberFilter(value: string): number | null {
    if (!value) {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private defaultSchoolYear(): string {
    const currentYear = new Date().getFullYear();
    return this.schoolYears.includes(currentYear as typeof this.schoolYears[number])
      ? `${currentYear}`
      : `${this.schoolYears[0]}`;
  }

  private hasRenewalCourseSelection(): boolean {
    return [
      this.renewalTargetYear(),
      this.renewalTargetCourseId(),
      this.renewalTargetBaseName(),
      this.renewalTargetLevel(),
      this.renewalTargetLetter(),
      this.renewalTargetSchedule()
    ].every((value) => value.trim().length > 0);
  }

  private prefillRenewalCourse(item: EnrollmentListItem): void {
    this.prefillRenewalTargetCourse(item.courseName, this.courseLetterFromName(item.courseName));
    this.renewalTargetSchedule.set('Manana');
  }

  private prefillRenewalTargetCourse(courseName: string, letter: string): void {
    const suggestedCourse = this.findPromotedCourseOption(this.renewalTargetCourseOptions(), courseName, letter);
    if (suggestedCourse) {
      this.renewalTargetCourseId.set(`${suggestedCourse.id}`);
      this.applyRenewalTargetCourse(suggestedCourse);
      return;
    }

    this.clearRenewalTargetCourse();
  }

  private findPromotedCourseOption(
    courses: EnrollmentOverview['courses'],
    currentCourseName: string,
    currentLetter: string
  ): EnrollmentOverview['courses'][number] | null {
    const nextBaseName = this.nextCourseBaseName(this.baseCourseName(currentCourseName));
    const normalizedNextBaseName = this.normalizeCourseName(nextBaseName);
    const normalizedCurrentLetter = (currentLetter || this.courseLetterFromName(currentCourseName)).trim().toUpperCase();

    return courses.find((course) =>
      this.normalizeCourseName(this.baseCourseName(course.name)) === normalizedNextBaseName
      && course.letter.trim().toUpperCase() === normalizedCurrentLetter
    ) ?? null;
  }

  private applyRenewalTargetCourse(course: EnrollmentOverview['courses'][number]): void {
    const baseName = this.baseCourseName(course.name);
    this.renewalTargetBaseName.set(baseName);
    this.renewalTargetLevel.set(this.levelFromCourseName(baseName));
    this.renewalTargetLetter.set(course.letter);
    this.renewalTargetSchedule.set(course.scheduleType);
  }

  private clearRenewalTargetCourse(): void {
    this.renewalTargetCourseId.set('');
    this.renewalTargetBaseName.set('');
    this.renewalTargetLevel.set('');
    this.renewalTargetLetter.set('');
    this.renewalTargetSchedule.set('');
  }

  private baseCourseName(courseName: string): string {
    return courseName.replace(/\s+[A-Z]$/i, '').trim();
  }

  private courseLetterFromName(courseName: string): string {
    const match = /\s+([A-Z])$/i.exec(courseName.trim());
    return match ? match[1].toUpperCase() : 'A';
  }

  private nextCourseBaseName(courseName: string): string {
    const normalized = this.normalizeCourseName(courseName);
    const nextByCourse = new Map<string, string>([
      ['PREKINDER', 'Kinder'],
      ['KINDER', '1 Básico'],
      ['1 BASICO', '2 Básico'],
      ['2 BASICO', '3 Básico'],
      ['3 BASICO', '4 Básico'],
      ['4 BASICO', '5 Básico'],
      ['5 BASICO', '6 Básico'],
      ['6 BASICO', '7 Básico'],
      ['7 BASICO', '8 Básico'],
      ['8 BASICO', '1 Medio'],
      ['1 MEDIO', '2 Medio'],
      ['2 MEDIO', '3 Medio'],
      ['3 MEDIO', '4 Medio']
    ]);
    return nextByCourse.get(normalized) ?? courseName;
  }

  levelFromCourseName(courseName: string): string {
    const normalized = this.normalizeCourseName(courseName);
    if (['PREKINDER', 'KINDER'].includes(normalized)) {
      return 'Inicial';
    }

    if (normalized.includes('MEDIO')) {
      return 'Medio';
    }

    return 'Básico';
  }

  private normalizeCourseName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[°º]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  private nextSchoolYearValue(value: string): string {
    const sourceYear = this.parseNumberFilter(value);
    if (sourceYear == null) {
      return this.renewalTargetYear();
    }

    const nextYear = Math.min(sourceYear + 1, this.schoolYears[this.schoolYears.length - 1]);
    return `${nextYear}`;
  }

  private todayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
  }
}
