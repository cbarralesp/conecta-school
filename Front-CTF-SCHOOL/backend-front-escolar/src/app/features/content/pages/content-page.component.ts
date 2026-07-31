import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  PlanningClass,
  PlanningClassCatalogs,
  PlanningClassDocument,
  PlanningDocumentFileType,
  PlanningSummary,
  PlanningUnit,
  PlanningUnitCatalogAssignment,
  PlanningUnitCatalogs
} from '../../../core/models/planning.models';
import { Course } from '../../../core/models/course.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CourseApiService } from '../../../core/services/course-api.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type ContentFilter = 'all' | 'pdf' | 'word' | 'ppt' | 'other';
type SemesterFilter = 'all' | 'S1' | 'S2';
type EducationStage = 'basic' | 'media';

type ContentDocumentView = {
  id: number;
  classId: number;
  title: string;
  type: Exclude<ContentFilter, 'all'>;
  sizeLabel: string;
  metaLabel: string;
  dateLabel: string;
  visibilityLabel: string;
  visibleToStudents: boolean;
};

type ContentClassView = {
  id: number;
  classNumber: number;
  title: string;
  plannedDate: string;
  dateLabel: string;
  statusLabel: string;
  statusTone: 'draft' | 'published';
  expanded: boolean;
  documents: ContentDocumentView[];
};

type ContentUnitView = {
  id: number;
  courseId: number;
  numberLabel: string;
  title: string;
  courseName: string;
  subjectName: string;
  weekLabel: string;
  progress: number;
  color: 'blue' | 'purple' | 'green' | 'orange';
  colorHex: string | null;
  expanded: boolean;
  classes: ContentClassView[];
  totalDocuments: number;
};

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './content-page.component.html',
  styleUrl: './content-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentPageComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly courseApiService = inject(CourseApiService);
  private readonly planningApiService = inject(PlanningApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly filter = signal<ContentFilter>('all');
  readonly classSearchDraft = signal('');
  readonly classSearch = signal('');
  readonly selectedYear = signal<number | null>(new Date().getFullYear());
  readonly selectedCourse = signal<number | 'all'>('all');
  readonly selectedSubject = signal<number | 'all'>('all');
  readonly selectedSemester = signal<SemesterFilter>(this.resolveDefaultSemesterFilter());
  readonly selectedEducationStage = signal<EducationStage>('basic');
  readonly units = signal<ContentUnitView[]>([]);
  readonly summary = signal<PlanningSummary | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly unitCatalogs = signal<PlanningUnitCatalogs | null>(null);
  readonly classCatalogs = signal<PlanningClassCatalogs | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 15, 20] as const;

  readonly unitTitleDraft = signal('');
  readonly unitAssignmentId = signal<number | null>(null);
  readonly unitNumberDraft = signal('');
  readonly classTitleDraft = signal('');
  readonly classDurationDraft = signal('');
  readonly classPlannedDateDraft = signal('');
  readonly classFile = signal<File | null>(null);
  readonly documentFile = signal<File | null>(null);
  readonly documentVisibility = signal<'student' | 'teacher'>('teacher');
  readonly currentDocumentName = signal('');
  readonly currentDocumentClassId = signal<number | null>(null);
  readonly currentDocumentId = signal<number | null>(null);
  readonly currentUnitId = signal<number | null>(null);
  readonly updatingDocumentVisibilityIds = signal<number[]>([]);
  readonly editingUnitId = signal<number | null>(null);
  readonly editingUnitNumberDraft = signal('');
  readonly editingUnitTitleDraft = signal('');
  readonly editingClassId = signal<number | null>(null);
  readonly editingClassTitleDraft = signal('');
  readonly isUnitDialogOpen = signal(false);
  readonly isClassDialogOpen = signal(false);
  readonly isEditUnitDialogOpen = signal(false);
  readonly isEditClassDialogOpen = signal(false);
  readonly isDocumentDialogOpen = signal(false);
  readonly isEditingDocument = computed(() => this.currentDocumentId() != null);
  readonly selectedDocumentFileName = computed(
    () => (this.documentFile()?.name ?? this.currentDocumentName()) || 'Click para subir un archivo compatible'
  );

  readonly stats = computed(() => {
    const summary = this.summary()?.summary;
    return [
      {
        label: 'Documentos totales',
        value: summary?.totalDocuments ?? 0,
        icon: 'description',
        tone: 'blue'
      },
      {
        label: 'Documentos visibles',
        value: summary?.visibleDocuments ?? 0,
        icon: 'visibility',
        tone: 'green'
      },
      {
        label: 'Unidades activas',
        value: this.units().length,
        icon: 'layers',
        tone: 'yellow'
      },
      {
        label: 'Clases activas',
        value: summary?.totalClasses ?? 0,
        icon: 'co_present',
        tone: 'violet'
      }
    ];
  });

  readonly filterChips = computed(() => {
    const documents = this.units()
      .flatMap((unit) => unit.classes)
      .flatMap((contentClass) => contentClass.documents);
    return [
      { key: 'all' as const, label: 'Todos', icon: 'layers', count: documents.length },
      { key: 'pdf' as const, label: 'PDF', icon: 'picture_as_pdf', count: documents.filter((item) => item.type === 'pdf').length },
      { key: 'word' as const, label: 'Word', icon: 'article', count: documents.filter((item) => item.type === 'word').length },
      { key: 'ppt' as const, label: 'PPT', icon: 'slideshow', count: documents.filter((item) => item.type === 'ppt').length }
    ];
  });

  readonly formatOptions = computed(() =>
    this.filterChips().map((chip) => ({
      value: chip.key,
      label: `${chip.label} (${chip.count})`
    }))
  );

  readonly semesterChips = computed(() => {
    const units = this.units();
    return [
      { key: 'S1' as const, label: 'Primer semestre', count: units.filter((unit) => this.resolveSemester(unit) === 'S1').length },
      { key: 'S2' as const, label: 'Segundo semestre', count: units.filter((unit) => this.resolveSemester(unit) === 'S2').length }
    ];
  });

  readonly semesterOptions = computed(() =>
    this.semesterChips().map((chip) => ({
      value: chip.key,
      label: chip.label
    }))
  );

  readonly assignmentOptions = computed(() => this.unitCatalogs()?.teachingAssignments ?? []);
  readonly yearOptions = computed(() => {
    const values = Array.from(new Set(this.courses().map((course) => course.schoolYear))).sort((left, right) => left - right);
    return values.map((value) => ({ value, label: String(value) }));
  });
  readonly courseOptions = computed(() => {
    const year = this.selectedYear();
    const options = this.courses()
      .filter((course) => year == null || course.schoolYear === year)
      .filter((course) => this.matchesEducationStage(course, this.selectedEducationStage()))
      .map((course) => ({
        id: course.id,
        name: course.letter ? `${course.name} ${course.letter}` : course.name
      }))
      .sort((left, right) => this.compareLabels(left.name, right.name));

    const uniqueOptions = new Map<string, { id: number; name: string }>();
    for (const option of options) {
      const key = this.normalizeCompare(option.name);
      if (!uniqueOptions.has(key)) {
        uniqueOptions.set(key, option);
      }
    }

    return Array.from(uniqueOptions.values());
  });
  readonly selectedCourseName = computed(() => {
    const selectedCourse = this.selectedCourse();
    if (selectedCourse !== 'all') {
      return this.courseOptions().find((course) => course.id === selectedCourse)?.name ?? 'Curso';
    }
    const defaultCourseId = this.resolveDefaultCourseId();
    return defaultCourseId === 'all'
      ? 'Curso'
      : this.courseOptions().find((course) => course.id === defaultCourseId)?.name ?? 'Curso';
  });
  readonly subjectOptions = computed(() => {
    const selectedCourse = this.selectedCourse();
    const subjects = new Map<number, string>();

    for (const assignment of this.assignmentOptions()) {
      if (selectedCourse !== 'all' && assignment.courseId !== selectedCourse) {
        continue;
      }
      if (!subjects.has(assignment.subjectId)) {
        subjects.set(assignment.subjectId, assignment.subjectName);
      }
    }

    return Array.from(subjects.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => this.compareLabels(left.name, right.name));
  });
  readonly selectedSubjectName = computed(() => {
    const selectedSubject = this.selectedSubject();
    return selectedSubject === 'all'
      ? 'Todas las asignaturas'
      : this.subjectOptions().find((subject) => subject.id === selectedSubject)?.name ?? 'Asignatura';
  });
  readonly visibleClassCount = computed(() =>
    this.units().reduce((total, unit) => total + unit.classes.length, 0)
  );
  readonly visibleDocumentCount = computed(() =>
    this.units().reduce((total, unit) => total + unit.totalDocuments, 0)
  );
  readonly unitNumberOptions = computed(() => this.unitCatalogs()?.unitNumbers ?? []);
  readonly durationOptions = computed(() => this.classCatalogs()?.durationOptions ?? []);
  readonly selectedClassFileName = computed(() => this.classFile()?.name ?? 'Click para subir un archivo compatible');
  readonly totalUnits = computed(() => this.units().length);
  readonly shouldShowPaginator = computed(() => this.totalUnits() > this.pageSize());
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalUnits() / this.pageSize())));
  readonly pageStart = computed(() => (this.totalUnits() === 0 ? 0 : this.pageIndex() * this.pageSize() + 1));
  readonly pageEnd = computed(() => Math.min(this.totalUnits(), (this.pageIndex() + 1) * this.pageSize()));
  readonly visiblePages = computed(() => {
    const totalPages = this.totalPages();
    const current = this.pageIndex();
    const start = Math.max(0, current - 2);
    const end = Math.min(totalPages, start + 5);
    const adjustedStart = Math.max(0, end - 5);
    return Array.from({ length: end - adjustedStart }, (_, index) => adjustedStart + index);
  });
  readonly pagedUnits = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.units().slice(start, start + this.pageSize());
  });
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  private contentRequestId = 0;
  private classCatalogsLoading = false;
  private classCatalogsLoadedCallbacks: Array<() => void> = [];

  constructor() {
    this.loadCourses();
    this.loadUnitCatalogs();
    this.loadContent();
  }

  setFilter(value: ContentFilter): void {
    this.filter.set(value);
    this.pageIndex.set(0);
    this.loadContent();
  }

  setYearFilter(value: number | null): void {
    this.selectedYear.set(value);
    const hasSelectedCourse = this.courseOptions().some((course) => course.id === this.selectedCourse());
    if (!hasSelectedCourse) {
      this.selectedCourse.set(this.resolveDefaultCourseId());
    }
    const hasSelectedSubject = this.subjectOptions().some((subject) => subject.id === this.selectedSubject());
    if (!hasSelectedSubject) {
      this.selectedSubject.set('all');
    }
    this.pageIndex.set(0);
    this.loadContent();
  }

  setCourseFilter(value: number | 'all'): void {
    this.selectedCourse.set(value);
    const hasSelectedSubject = this.subjectOptions().some((subject) => subject.id === this.selectedSubject());
    if (!hasSelectedSubject) {
      this.selectedSubject.set('all');
    }
    this.pageIndex.set(0);
    this.loadContent();
  }

  setEducationStage(value: EducationStage): void {
    if (this.selectedEducationStage() === value) {
      return;
    }

    this.selectedEducationStage.set(value);
    const hasSelectedCourse = this.courseOptions().some((course) => course.id === this.selectedCourse());
    if (!hasSelectedCourse) {
      this.selectedCourse.set(this.resolveDefaultCourseId());
      this.selectedSubject.set('all');
    }
    this.pageIndex.set(0);
    this.loadContent();
  }

  setClassSearch(value: string): void {
    this.classSearchDraft.set(value);
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
    this.searchDebounceHandle = setTimeout(() => {
      const nextValue = value.trim();
      if (this.classSearch() === nextValue) {
        return;
      }
      this.classSearch.set(nextValue);
      this.pageIndex.set(0);
      this.loadContent(false);
    }, 260);
  }

  setSubjectFilter(value: number | 'all'): void {
    this.selectedSubject.set(value);
    this.pageIndex.set(0);
    this.loadContent();
  }

  setSemesterFilter(value: SemesterFilter): void {
    this.selectedSemester.set(value);
    this.pageIndex.set(0);
    this.loadContent();
  }

  setPage(page: number): void {
    const nextPage = Math.max(0, Math.min(page, this.totalPages() - 1));
    this.pageIndex.set(nextPage);
  }

  goToPreviousPage(): void {
    if (this.pageIndex() > 0) {
      this.pageIndex.update((value) => value - 1);
    }
  }

  goToNextPage(): void {
    if (this.pageIndex() < this.totalPages() - 1) {
      this.pageIndex.update((value) => value + 1);
    }
  }

  updatePageSize(value: number | string): void {
    const nextSize = Number(value);
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }
    this.pageSize.set(nextSize);
    this.pageIndex.set(0);
  }

  toggleUnit(unitId: number): void {
    this.units.update((current) =>
      current.map((unit) => (unit.id === unitId ? { ...unit, expanded: !unit.expanded } : unit))
    );
  }

  toggleClass(unitId: number, classId: number): void {
    this.units.update((current) =>
      current.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              classes: unit.classes.map((contentClass) =>
                contentClass.id === classId ? { ...contentClass, expanded: !contentClass.expanded } : contentClass
              )
            }
          : unit
      )
    );
  }

  openDocumentDialog(classId: number, event?: Event): void {
    event?.stopPropagation();
    this.currentDocumentClassId.set(classId);
    this.currentDocumentId.set(null);
    this.currentDocumentName.set('');
    this.documentVisibility.set('teacher');
    this.documentFile.set(null);
    this.isDocumentDialogOpen.set(true);
  }

  openEditDocumentDialog(document: ContentDocumentView, event?: Event): void {
    event?.stopPropagation();
    this.currentDocumentClassId.set(document.classId);
    this.currentDocumentId.set(document.id);
    this.currentDocumentName.set(document.title);
    this.documentVisibility.set(document.visibleToStudents ? 'student' : 'teacher');
    this.documentFile.set(null);
    this.isDocumentDialogOpen.set(true);
  }

  openUnitDialog(): void {
    this.unitTitleDraft.set('');
    this.unitAssignmentId.set(this.assignmentOptions()[0]?.loadId ?? null);
    this.unitNumberDraft.set(this.unitNumberOptions()[0]?.code ?? '');
    this.isUnitDialogOpen.set(true);
  }

  openClassDialog(unitId: number): void {
    if (!this.classCatalogs()) {
      this.loadClassCatalogs(() => this.openClassDialog(unitId));
      return;
    }

    this.currentUnitId.set(unitId);
    this.classTitleDraft.set('');
    this.classDurationDraft.set(this.durationOptions()[0]?.code ?? '');
    this.classPlannedDateDraft.set(this.todayIsoDate());
    this.classFile.set(null);
    this.isClassDialogOpen.set(true);
  }

  openEditUnitDialog(unit: ContentUnitView, event?: Event): void {
    event?.stopPropagation();
    this.editingUnitId.set(unit.id);
    this.editingUnitNumberDraft.set(this.expandUnitNumberLabel(unit.numberLabel));
    this.editingUnitTitleDraft.set(unit.title);
    this.isEditUnitDialogOpen.set(true);
  }

  deleteUnit(unit: ContentUnitView, event?: Event): void {
    event?.stopPropagation();
    const confirmed = window.confirm(`Eliminar la unidad "${unit.title}"?`);
    if (!confirmed) {
      return;
    }

    this.planningApiService.deleteUnit(unit.id).subscribe({
      next: () => {
        this.snackBar.open('Unidad eliminada correctamente', 'Cerrar', { duration: 2600 });
        this.loadContent();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar la unidad')
    });
  }

  openEditClassDialog(contentClass: ContentClassView, event?: Event): void {
    event?.stopPropagation();
    this.editingClassId.set(contentClass.id);
    this.editingClassTitleDraft.set(contentClass.title);
    this.isEditClassDialogOpen.set(true);
  }

  deleteClass(contentClass: ContentClassView, event?: Event): void {
    event?.stopPropagation();
    const confirmed = window.confirm(`Eliminar la clase "${contentClass.title}"?`);
    if (!confirmed) {
      return;
    }

    this.planningApiService.deleteClass(contentClass.id).subscribe({
      next: () => {
        this.snackBar.open('Clase eliminada correctamente', 'Cerrar', { duration: 2600 });
        this.loadContent();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar la clase')
    });
  }

  closeDialogs(): void {
    this.isUnitDialogOpen.set(false);
    this.isClassDialogOpen.set(false);
    this.isEditUnitDialogOpen.set(false);
    this.isEditClassDialogOpen.set(false);
    this.currentUnitId.set(null);
    this.classFile.set(null);
    this.editingUnitId.set(null);
    this.editingClassId.set(null);
    this.currentDocumentClassId.set(null);
    this.currentDocumentId.set(null);
    this.currentDocumentName.set('');
    this.documentFile.set(null);
    this.documentVisibility.set('teacher');
    this.isDocumentDialogOpen.set(false);
  }

  onClassFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.classFile.set(input.files?.[0] ?? null);
  }

  onDocumentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.documentFile.set(input.files?.[0] ?? null);
  }

  createUnit(): void {
    const title = this.unitTitleDraft().trim();
    const assignment = this.assignmentOptions().find((item) => item.loadId === this.unitAssignmentId());
    const unitNumber = this.unitNumberDraft();

    if (!title || !assignment || !unitNumber) {
      this.snackBar.open('Completa la carga docente, unidad y titulo', 'Cerrar', { duration: 2800 });
      return;
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);

    this.planningApiService
      .saveUnitDraft({
        subjectId: assignment.subjectId,
        courseId: assignment.courseId,
        unitNumber,
        name: title,
        colorHex: assignment.subjectColorHex || '#6d28d9',
        startWeek: null,
        startDate: this.toIsoDate(startDate),
        endDate: this.toIsoDate(endDate),
        estimatedWeeks: 1,
        plannedClasses: 0,
        generalDescription: '',
        learningObjectives: '',
        achievementIndicators: ''
      })
      .subscribe({
        next: () => {
          this.closeDialogs();
          this.snackBar.open('Unidad creada en borrador', 'Cerrar', { duration: 2600 });
          this.loadUnitCatalogs();
          this.loadContent();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible crear la unidad')
      });
  }

  createClass(): void {
    const title = this.classTitleDraft().trim();
    const unitId = this.currentUnitId();
    const durationCode = this.classDurationDraft().trim();
    const plannedDate = this.classPlannedDateDraft().trim();

    if (!title || unitId == null || !durationCode || !plannedDate) {
      this.snackBar.open('Completa el titulo, la duracion y la fecha', 'Cerrar', { duration: 2800 });
      return;
    }

    this.planningApiService
      .saveClassDraft({
        unitId,
        durationCode,
        plannedDate,
        title,
        objectiveCode: '',
        evaluationType: '',
        objectiveDescription: '',
        startActivity: '',
        developmentActivity: '',
        closingActivity: ''
      })
      .pipe(
        switchMap((planningClass) => {
          const file = this.classFile();
          if (!file) {
            return of(planningClass);
          }

          return this.planningApiService.uploadClassDocument(planningClass.id, file, false).pipe(
            switchMap(() => of(planningClass))
          );
        })
      )
      .subscribe({
        next: () => {
          this.closeDialogs();
          this.snackBar.open('Clase creada correctamente', 'Cerrar', { duration: 2600 });
          this.loadContent();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible crear la clase')
      });
  }

  updateUnit(): void {
    const unitId = this.editingUnitId();
    const unitNumber = this.editingUnitNumberDraft().trim();
    const title = this.editingUnitTitleDraft().trim();

    if (unitId == null || !unitNumber || !title) {
      this.snackBar.open('Completa el número y titulo de la unidad', 'Cerrar', { duration: 2800 });
      return;
    }

    this.planningApiService.updateUnit(unitId, { unitNumber, name: title }).subscribe({
      next: (unit) => {
        this.applyUpdatedUnit(unit);
        this.closeDialogs();
        this.snackBar.open('Unidad actualizada correctamente', 'Cerrar', { duration: 2600 });
        this.loadContent();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible actualizar la unidad')
    });
  }

  updateClassTitle(): void {
    const classId = this.editingClassId();
    const title = this.editingClassTitleDraft().trim();

    if (classId == null || !title) {
      this.snackBar.open('Ingresa un titulo para la clase', 'Cerrar', { duration: 2800 });
      return;
    }

    this.planningApiService.updateClassTitle(classId, title).subscribe({
      next: (planningClass) => {
        this.applyUpdatedClassTitle(planningClass.id, planningClass.title);
        this.closeDialogs();
        this.snackBar.open('Clase actualizada correctamente', 'Cerrar', { duration: 2600 });
        this.loadContent();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible actualizar la clase')
    });
  }

  visibleClasses(unit: ContentUnitView): ContentClassView[] {
    return unit.classes;
  }

  visibleDocuments(contentClass: ContentClassView): ContentDocumentView[] {
    return contentClass.documents;
  }

  downloadDocument(contentDocument: ContentDocumentView): void {
    this.planningApiService.downloadPlanningDocument(contentDocument.id).subscribe({
      next: (response) => {
        const blob = response.body ?? new Blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = contentDocument.title || `documento-${contentDocument.id}`;
        link.style.display = 'none';
        window.document.body.appendChild(link);
        link.click();
        window.setTimeout(() => {
          window.document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 0);
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible descargar el documento')
    });
  }

  saveDocument(): void {
    const classId = this.currentDocumentClassId();
    const file = this.documentFile();
    const visibleToStudents = this.documentVisibility() === 'student';
    const currentDocumentId = this.currentDocumentId();

    if (classId == null) {
      this.snackBar.open('No se encontro la clase asociada al documento.', 'Cerrar', { duration: 2800 });
      return;
    }

    if (currentDocumentId == null && !file) {
      this.snackBar.open('Selecciona un archivo para continuar.', 'Cerrar', { duration: 2800 });
      return;
    }

    const request$ = currentDocumentId != null && !file
      ? this.planningApiService.updatePlanningDocumentVisibility(currentDocumentId, visibleToStudents).pipe(map(() => null))
      : this.planningApiService.uploadClassDocument(classId, file!, visibleToStudents).pipe(
          switchMap(() =>
            currentDocumentId == null
              ? of(null)
              : this.planningApiService.deletePlanningDocument(currentDocumentId).pipe(switchMap(() => of(null)))
          )
        );

    request$.subscribe({
      next: () => {
        this.closeDialogs();
        this.snackBar.open(
          currentDocumentId == null ? 'Documento agregado correctamente' : 'Documento actualizado correctamente',
          'Cerrar',
          { duration: 2600 }
        );
        this.loadContent();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible guardar el documento')
    });
  }

  deleteDocument(document: ContentDocumentView, event?: Event): void {
    event?.stopPropagation();
    const confirmed = window.confirm(`Eliminar el documento "${document.title}"?`);
    if (!confirmed) {
      return;
    }

    this.planningApiService.deletePlanningDocument(document.id).subscribe({
      next: () => {
        this.snackBar.open('Documento eliminado correctamente', 'Cerrar', { duration: 2600 });
        this.loadContent();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible eliminar el documento')
    });
  }

  toggleDocumentStudentVisibility(document: ContentDocumentView, event?: Event): void {
    event?.stopPropagation();

    if (this.updatingDocumentVisibilityIds().includes(document.id)) {
      return;
    }

    this.updatingDocumentVisibilityIds.update((current) => [...current, document.id]);

    this.planningApiService.updatePlanningDocumentVisibility(document.id, !document.visibleToStudents).subscribe({
      next: () => {
        this.snackBar.open(
          !document.visibleToStudents
            ? 'Documento visible para estudiante'
            : 'Documento marcado solo para docente',
          'Cerrar',
          { duration: 2400 }
        );
        this.updatingDocumentVisibilityIds.update((current) => current.filter((id) => id !== document.id));
        this.loadContent(false);
      },
      error: (error: HttpErrorResponse) => {
        this.updatingDocumentVisibilityIds.update((current) => current.filter((id) => id !== document.id));
        this.showError(error, 'No fue posible actualizar la visibilidad del documento');
      }
    });
  }

  isUpdatingDocumentVisibility(documentId: number): boolean {
    return this.updatingDocumentVisibilityIds().includes(documentId);
  }

  iconForDocument(type: Exclude<ContentFilter, 'all'>): string {
    switch (type) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'word':
        return 'article';
      case 'ppt':
        return 'slideshow';
      case 'other':
        return 'folder';
    }
  }

  toneForDocument(type: Exclude<ContentFilter, 'all'>): string {
    return type;
  }

  iconForSubject(subjectName: string): string {
    const normalized = this.normalizeCompare(subjectName);
    if (normalized.includes('matemat')) return 'calculate';
    if (normalized.includes('ciencia')) return 'eco';
    if (normalized.includes('historia')) return 'account_balance';
    if (normalized.includes('arte')) return 'palette';
    if (normalized.includes('musica')) return 'music_note';
    if (normalized.includes('tecnolog')) return 'computer';
    if (normalized.includes('fisica') || normalized.includes('deporte')) return 'sports_soccer';
    if (normalized.includes('religion')) return 'volunteer_activism';
    if (normalized.includes('ingles') || normalized.includes('idioma')) return 'translate';
    return 'menu_book';
  }

  toneForSubject(subjectName: string): string {
    const normalized = this.normalizeCompare(subjectName);
    if (normalized.includes('matemat')) return 'green';
    if (normalized.includes('ciencia')) return 'lime';
    if (normalized.includes('historia')) return 'blue';
    if (normalized.includes('arte')) return 'cobalt';
    if (normalized.includes('musica')) return 'orange';
    if (normalized.includes('tecnolog')) return 'cyan';
    if (normalized.includes('fisica') || normalized.includes('deporte')) return 'red';
    if (normalized.includes('religion')) return 'yellow';
    if (normalized.includes('ingles') || normalized.includes('idioma')) return 'indigo';
    return 'purple';
  }

  visibleUnits(): ContentUnitView[] {
    return this.pagedUnits();
  }

  private loadUnitCatalogs(): void {
    this.planningApiService.getUnitCatalogs().subscribe({
      next: (unitCatalogs) => this.unitCatalogs.set(unitCatalogs),
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los catálogos de contenido')
    });
  }

  private loadClassCatalogs(onLoaded?: () => void): void {
    if (this.classCatalogs()) {
      onLoaded?.();
      return;
    }
    if (onLoaded) {
      this.classCatalogsLoadedCallbacks.push(onLoaded);
    }
    if (this.classCatalogsLoading) {
      return;
    }

    this.classCatalogsLoading = true;
    this.planningApiService.getClassCatalogs().subscribe({
      next: (classCatalogs) => {
        this.classCatalogs.set(classCatalogs);
        this.classCatalogsLoading = false;
        const callbacks = this.classCatalogsLoadedCallbacks.splice(0);
        callbacks.forEach((callback) => callback());
      },
      error: (error: HttpErrorResponse) => {
        this.classCatalogsLoading = false;
        this.classCatalogsLoadedCallbacks = [];
        this.showError(error, 'No fue posible cargar las duraciones de clase');
      }
    });
  }

  private loadCourses(): void {
    this.courseApiService.findAll().subscribe({
      next: (courses) => {
        this.courses.set(courses.filter((course) => course.active));
        const selectedYear = this.selectedYear();
        if (selectedYear != null && !this.yearOptions().some((year) => year.value === selectedYear)) {
          this.selectedYear.set(this.yearOptions().at(-1)?.value ?? null);
        }
        this.ensureSelectedCourse();
        this.loadContent(false);
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los cursos')
    });
  }

  private ensureSelectedCourse(): void {
    const hasSelectedCourse = this.courseOptions().some((course) => course.id === this.selectedCourse());
    if (!hasSelectedCourse) {
      this.selectedCourse.set(this.resolveDefaultCourseId());
    }
  }

  private resolveDefaultCourseId(): number | 'all' {
    const options = this.courseOptions();
    const exactPrekinderA = options.find((course) => this.normalizeCompare(course.name) === 'prekinder a');
    if (exactPrekinderA) {
      return exactPrekinderA.id;
    }

    const prekinder = options.find((course) => this.normalizeCompare(course.name).includes('prekinder'));
    if (prekinder) {
      return prekinder.id;
    }

    return options[0]?.id ?? 'all';
  }

  private resolveDefaultSemesterFilter(): SemesterFilter {
    const month = new Date().getMonth() + 1;
    return month <= 6 ? 'S1' : 'S2';
  }

  private loadContent(showLoader = true): void {
    const requestId = ++this.contentRequestId;
    if (showLoader) {
      this.isLoading.set(true);
    }
    const selectedCourse = this.selectedCourse();
    const courseId = selectedCourse === 'all' ? undefined : selectedCourse;
    const selectedSubject = this.selectedSubject();
    const subjectId = selectedSubject === 'all' ? undefined : selectedSubject;
    const year = this.selectedYear() ?? undefined;
    const semester = this.resolveSemesterNumber(this.selectedSemester());
    const documentType = this.resolveDocumentTypeFilter(this.filter());
    const search = this.classSearch().trim() || undefined;
    forkJoin({
      summary: this.planningApiService.getPlanningSummary({ year, courseId, subjectId, semester, documentType }),
      classes: this.planningApiService.getClasses({ year, courseId, subjectId, semester, documentType, search })
    }).subscribe({
      next: ({ summary, classes }) => {
        if (requestId !== this.contentRequestId) {
          return;
        }
        this.summary.set(summary);
        this.units.set(this.buildUnits(summary, classes));
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.contentRequestId) {
          return;
        }
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el contenido académico');
      }
    });
  }

  private buildUnits(summary: PlanningSummary, classes: PlanningClass[]): ContentUnitView[] {
    const classesByUnit = new Map<number, PlanningClass[]>();
    for (const planningClass of classes) {
      const current = classesByUnit.get(planningClass.unitId) ?? [];
      current.push(planningClass);
      classesByUnit.set(planningClass.unitId, current);
    }

    const palette: ContentUnitView['color'][] = ['purple', 'green', 'orange', 'blue'];
    const summaryUnitsById = new Map(summary.units.map((unit) => [unit.id, unit]));
    const sortedUnitIds = Array.from(
      new Set([
        ...summary.units.map((unit) => unit.id),
        ...classes.map((planningClass) => planningClass.unitId)
      ])
    ).sort((left, right) => {
      const leftSummary = summaryUnitsById.get(left);
      const rightSummary = summaryUnitsById.get(right);

      if (leftSummary && rightSummary) {
        return this.compareUnits(leftSummary, rightSummary);
      }

      if (leftSummary) {
        return -1;
      }

      if (rightSummary) {
        return 1;
      }

      const leftClass = classesByUnit.get(left)?.[0] ?? null;
      const rightClass = classesByUnit.get(right)?.[0] ?? null;
      if (leftClass && rightClass) {
        return this.comparePlanningUnitFallback(leftClass, rightClass);
      }

      return left - right;
    });
    const firstVisibleUnitId = sortedUnitIds.find((unitId) => (classesByUnit.get(unitId)?.length ?? 0) > 0);

    return sortedUnitIds.flatMap((unitId, index) => {
      const summaryUnit = summaryUnitsById.get(unitId) ?? null;
      const sourceClasses = [...(classesByUnit.get(unitId) ?? [])]
        .sort((left, right) => this.comparePlanningClasses(left, right));
      const unitClasses = sourceClasses
        .map((planningClass, classIndex) => this.mapClass(planningClass, classIndex + 1));

      if (unitClasses.length === 0) {
        return [];
      }

      const firstClass = sourceClasses[0] ?? null;
      const totalDocuments = unitClasses.reduce((count, contentClass) => count + contentClass.documents.length, 0);
      const fallbackWeekLabel = this.buildWeekLabelFromClasses(sourceClasses);

      return [{
        id: unitId,
        courseId: summaryUnit ? this.resolveCourseId(summaryUnit.courseName) : (firstClass?.courseId ?? -1),
        numberLabel: this.normalizeUnitBadgeLabel(summaryUnit?.code ?? firstClass?.unitNumberLabel ?? `U${index + 1}`),
        title: summaryUnit?.name ?? (firstClass?.unitName || 'Unidad'),
        courseName: summaryUnit?.courseName ?? (firstClass?.courseName || ''),
        subjectName: summaryUnit?.subjectName ?? (firstClass?.subjectName || ''),
        weekLabel: summaryUnit?.weekRange ?? fallbackWeekLabel,
        progress: summaryUnit?.progressPercent ?? (unitClasses.length > 0 ? 100 : 0),
        color: palette[index % palette.length],
        colorHex: summaryUnit?.unitColorHex ?? null,
        expanded: unitId === firstVisibleUnitId,
        classes: unitClasses,
        totalDocuments
      }];
    });
  }

  private mapClass(planningClass: PlanningClass, classNumber: number): ContentClassView {
    return {
      id: planningClass.id,
      classNumber,
      title: planningClass.title,
      plannedDate: planningClass.plannedDate,
      dateLabel: this.formatDate(planningClass.plannedDate),
      statusLabel: planningClass.status === 'PUBLICADA' ? 'Publicada' : 'Borrador',
      statusTone: planningClass.status === 'PUBLICADA' ? 'published' : 'draft',
      expanded: planningClass.documents.length > 0,
      documents: planningClass.documents.map((document) => this.mapDocument(document))
    };
  }

  private mapDocument(document: PlanningClassDocument): ContentDocumentView {
    return {
      id: document.id,
      classId: document.classId,
      title: document.originalName,
      type: this.resolveDocumentType(document),
      sizeLabel: this.formatBytes(document.sizeBytes),
      metaLabel: document.visibleToStudents ? 'Visible docente y estudiante' : 'Visible docente',
      dateLabel: this.formatDateTime(document.uploadedAt),
      visibilityLabel: document.visibleToStudents ? 'Visible estudiante activo' : 'Visible estudiante inactivo',
      visibleToStudents: document.visibleToStudents
    };
  }

  private resolveDocumentType(document: PlanningClassDocument): Exclude<ContentFilter, 'all'> {
    switch (document.fileType) {
      case 'PDF':
        return 'pdf';
      case 'WORD':
        return 'word';
      case 'PPT':
        return 'ppt';
      case 'OTRO':
        return 'other';
    }

    const extension = document.extension.toLowerCase();
    if (extension === 'pdf') {
      return 'pdf';
    }
    if (extension === 'doc' || extension === 'docx') {
      return 'word';
    }
    if (extension === 'ppt' || extension === 'pptx') {
      return 'ppt';
    }
    return 'other';
  }

  private resolveDocumentTypeFilter(value: ContentFilter): PlanningDocumentFileType | undefined {
    switch (value) {
      case 'pdf':
        return 'PDF';
      case 'word':
        return 'WORD';
      case 'ppt':
        return 'PPT';
      case 'other':
        return 'OTRO';
      default:
        return undefined;
    }
  }

  private buildWeekLabelFromClasses(classes: PlanningClass[]): string {
    const weeks = classes
      .map((planningClass) => {
        const date = new Date(planningClass.plannedDate);
        return Number.isNaN(date.getTime()) ? null : this.resolveAcademicWeek(date);
      })
      .filter((week): week is number => week != null);

    if (!weeks.length) {
      return '-';
    }

    const minWeek = Math.min(...weeks);
    const maxWeek = Math.max(...weeks);
    return minWeek === maxWeek ? String(minWeek) : `${minWeek}-${maxWeek}`;
  }

  private resolveAcademicWeek(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const semesterStartMonth = month >= 7 ? 7 : 3;
    const semesterStart = new Date(year, semesterStartMonth - 1, 1);
    const diffDays = Math.max(0, Math.floor((date.getTime() - semesterStart.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.floor(diffDays / 7) + 1;
  }

  private formatBytes(value: number): string {
    if (value >= 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (value >= 1024) {
      return `${Math.round(value / 1024)} KB`;
    }
    return `${value} B`;
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  private formatDateTime(value: string): string {
    return this.formatDate(value);
  }

  private todayIsoDate(): string {
    return this.toIsoDate(new Date());
  }

  private resolveCourseId(courseName: string): number {
    const assignment = this.assignmentOptions().find((item) => item.courseName === courseName);
    return assignment?.courseId ?? -1;
  }

  private resolveSemester(unit: ContentUnitView): SemesterFilter {
    const firstPlannedDate = unit.classes
      .map((contentClass) => contentClass.plannedDate)
      .find((plannedDate) => Boolean(plannedDate));

    if (!firstPlannedDate) {
      return 'S1';
    }

    const month = new Date(firstPlannedDate).getMonth() + 1;
    return month <= 6 ? 'S1' : 'S2';
  }

  private resolveSemesterNumber(value: SemesterFilter): number | undefined {
    if (value === 'S1') {
      return 1;
    }
    if (value === 'S2') {
      return 2;
    }
    return undefined;
  }

  private applyUpdatedUnit(unit: PlanningUnit): void {
    this.units.update((current) =>
      current.map((item) =>
        item.id === unit.id
          ? {
              ...item,
              numberLabel: this.compactUnitNumber(unit.unitNumber),
              title: unit.name
            }
          : item
      )
    );
  }

  private applyUpdatedClassTitle(classId: number, title: string): void {
    this.units.update((current) =>
      current.map((unit) => ({
        ...unit,
        classes: unit.classes.map((contentClass) =>
          contentClass.id === classId ? { ...contentClass, title } : contentClass
        )
      }))
    );
  }

  private expandUnitNumberLabel(value: string): string {
    return ({
      U1: 'UNIDAD_I',
      U2: 'UNIDAD_II',
      U3: 'UNIDAD_III',
      U4: 'UNIDAD_IV',
      U5: 'UNIDAD_V',
      U6: 'UNIDAD_VI',
      U7: 'UNIDAD_VII',
      U8: 'UNIDAD_VIII'
    } as Record<string, string>)[value] ?? value;
  }

  private compactUnitNumber(value: string): string {
    return ({
      UNIDAD_I: 'U1',
      UNIDAD_II: 'U2',
      UNIDAD_III: 'U3',
      UNIDAD_IV: 'U4',
      UNIDAD_V: 'U5',
      UNIDAD_VI: 'U6',
      UNIDAD_VII: 'U7',
      UNIDAD_VIII: 'U8'
    } as Record<string, string>)[value] ?? value;
  }

  private normalizeUnitBadgeLabel(value: string): string {
    const compact = this.compactUnitNumber(value);
    if (/^U\d+$/i.test(compact)) {
      return compact.toUpperCase();
    }

    const normalized = this.normalizeCompare(value)
      .replace(/\s+/g, '')
      .replace(/_/g, '');

    const romanMap: Record<string, string> = {
      unidadi: 'U1',
      unidadii: 'U2',
      unidadiii: 'U3',
      unidadiv: 'U4',
      unidadv: 'U5',
      unidadvi: 'U6',
      unidadvii: 'U7',
      unidadviii: 'U8'
    };

    if (romanMap[normalized]) {
      return romanMap[normalized];
    }

    const numericMatch = value.match(/\d+/);
    if (numericMatch) {
      return `U${numericMatch[0]}`;
    }

    return value;
  }

  private compareUnits(left: PlanningSummary['units'][number], right: PlanningSummary['units'][number]): number {
    const courseDiff = this.compareLabels(left.courseName, right.courseName);
    if (courseDiff !== 0) {
      return courseDiff;
    }

    const subjectDiff = this.compareLabels(left.subjectName, right.subjectName);
    if (subjectDiff !== 0) {
      return subjectDiff;
    }

    const unitNumberDiff = this.extractUnitSortNumber(left.code) - this.extractUnitSortNumber(right.code);
    if (unitNumberDiff !== 0) {
      return unitNumberDiff;
    }

    return this.compareLabels(left.name, right.name);
  }

  private comparePlanningUnitFallback(left: PlanningClass, right: PlanningClass): number {
    const courseDiff = this.compareLabels(left.courseName, right.courseName);
    if (courseDiff !== 0) {
      return courseDiff;
    }

    const subjectDiff = this.compareLabels(left.subjectName, right.subjectName);
    if (subjectDiff !== 0) {
      return subjectDiff;
    }

    const unitNumberDiff = this.extractUnitSortNumber(left.unitNumberLabel) - this.extractUnitSortNumber(right.unitNumberLabel);
    if (unitNumberDiff !== 0) {
      return unitNumberDiff;
    }

    const plannedDateDiff = left.plannedDate.localeCompare(right.plannedDate);
    if (plannedDateDiff !== 0) {
      return plannedDateDiff;
    }

    return this.compareLabels(left.unitName, right.unitName);
  }

  private compareContentClasses(left: ContentClassView, right: ContentClassView): number {
    const classNumberDiff = left.classNumber - right.classNumber;
    if (classNumberDiff !== 0) {
      return classNumberDiff;
    }

    const plannedDateDiff = left.plannedDate.localeCompare(right.plannedDate);
    if (plannedDateDiff !== 0) {
      return plannedDateDiff;
    }

    return this.compareLabels(left.title, right.title);
  }

  private comparePlanningClasses(left: PlanningClass, right: PlanningClass): number {
    const idDiff = left.id - right.id;
    if (idDiff !== 0) {
      return idDiff;
    }

    const plannedDateDiff = left.plannedDate.localeCompare(right.plannedDate);
    if (plannedDateDiff !== 0) {
      return plannedDateDiff;
    }

    return this.compareLabels(left.title, right.title);
  }

  private extractUnitSortNumber(value: string): number {
    return this.extractFirstNumber(value);
  }

  private extractFirstNumber(value: string): number {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  }

  private compareLabels(left: string, right: string): number {
    return left.localeCompare(right, 'es', { numeric: true, sensitivity: 'base' });
  }

  private matchesEducationStage(course: Course, stage: EducationStage): boolean {
    const label = this.normalizeCompare(`${course.level} ${course.name} ${course.code}`);
    const isMedia = label.includes('media') || label.includes('medio');
    return stage === 'media' ? isMedia : !isMedia;
  }

  private normalizeCompare(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }
}
