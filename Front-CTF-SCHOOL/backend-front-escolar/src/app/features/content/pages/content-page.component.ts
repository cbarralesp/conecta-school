import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
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
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type ContentFilter = 'all' | 'pdf' | 'word' | 'ppt' | 'other';
type SemesterFilter = 'all' | 'S1' | 'S2';

type ContentDocumentView = {
  id: number;
  title: string;
  type: Exclude<ContentFilter, 'all'>;
  sizeLabel: string;
  metaLabel: string;
  dateLabel: string;
  visibilityLabel: string;
};

type ContentClassView = {
  id: number;
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
  weekLabel: string;
  progress: number;
  color: 'blue' | 'purple' | 'green' | 'orange';
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
  private readonly planningApiService = inject(PlanningApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly filter = signal<ContentFilter>('all');
  readonly selectedCourse = signal<number | 'all'>('all');
  readonly selectedSemester = signal<SemesterFilter>('all');
  readonly units = signal<ContentUnitView[]>([]);
  readonly summary = signal<PlanningSummary | null>(null);
  readonly unitCatalogs = signal<PlanningUnitCatalogs | null>(null);
  readonly classCatalogs = signal<PlanningClassCatalogs | null>(null);

  readonly unitTitleDraft = signal('');
  readonly unitAssignmentId = signal<number | null>(null);
  readonly unitNumberDraft = signal('');
  readonly classTitleDraft = signal('');
  readonly classDurationDraft = signal('');
  readonly classPlannedDateDraft = signal('');
  readonly classFile = signal<File | null>(null);
  readonly currentUnitId = signal<number | null>(null);
  readonly editingUnitId = signal<number | null>(null);
  readonly editingUnitNumberDraft = signal('');
  readonly editingUnitTitleDraft = signal('');
  readonly editingClassId = signal<number | null>(null);
  readonly editingClassTitleDraft = signal('');
  readonly isUnitDialogOpen = signal(false);
  readonly isClassDialogOpen = signal(false);
  readonly isEditUnitDialogOpen = signal(false);
  readonly isEditClassDialogOpen = signal(false);

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
        value: summary?.totalUnits ?? 0,
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
  readonly semesterChips = computed(() => {
    const units = this.units();
    return [
      { key: 'S1' as const, label: 'Semestre 1', count: units.filter((unit) => this.resolveSemester(unit) === 'S1').length },
      { key: 'S2' as const, label: 'Semestre 2', count: units.filter((unit) => this.resolveSemester(unit) === 'S2').length }
    ];
  });

  readonly assignmentOptions = computed(() => this.unitCatalogs()?.teachingAssignments ?? []);
  readonly courseOptions = computed(() => {
    const courses = new Map<number, string>();
    for (const assignment of this.assignmentOptions()) {
      if (!courses.has(assignment.courseId)) {
        courses.set(assignment.courseId, assignment.courseName);
      }
    }

    return Array.from(courses.entries()).map(([id, name]) => ({ id, name }));
  });
  readonly unitNumberOptions = computed(() => this.unitCatalogs()?.unitNumbers ?? []);
  readonly durationOptions = computed(() => this.classCatalogs()?.durationOptions ?? []);
  readonly selectedClassFileName = computed(() => this.classFile()?.name ?? 'Click para subir un archivo compatible');

  constructor() {
    this.loadCatalogs();
    this.loadContent();
  }

  setFilter(value: ContentFilter): void {
    this.filter.set(value);
    this.loadContent();
  }

  setCourseFilter(value: number | 'all'): void {
    this.selectedCourse.set(value);
    this.loadContent();
  }

  setSemesterFilter(value: SemesterFilter): void {
    this.selectedSemester.set(this.selectedSemester() === value ? 'all' : value);
    this.loadContent();
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

  openUnitDialog(): void {
    this.unitTitleDraft.set('');
    this.unitAssignmentId.set(this.assignmentOptions()[0]?.loadId ?? null);
    this.unitNumberDraft.set(this.unitNumberOptions()[0]?.code ?? '');
    this.isUnitDialogOpen.set(true);
  }

  openClassDialog(unitId: number): void {
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

  openEditClassDialog(contentClass: ContentClassView, event?: Event): void {
    event?.stopPropagation();
    this.editingClassId.set(contentClass.id);
    this.editingClassTitleDraft.set(contentClass.title);
    this.isEditClassDialogOpen.set(true);
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
  }

  onClassFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.classFile.set(input.files?.[0] ?? null);
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
          this.loadCatalogs();
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

          return this.planningApiService.uploadClassDocument(planningClass.id, file, true).pipe(
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
      this.snackBar.open('Completa el numero y titulo de la unidad', 'Cerrar', { duration: 2800 });
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

  downloadDocument(documentId: number): void {
    this.planningApiService.downloadPlanningDocument(documentId).subscribe({
      next: (response) => {
        const fileName = this.resolveFileName(response.headers) ?? `documento-${documentId}`;
        const blob = response.body ?? new Blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible descargar el documento')
    });
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

  visibleUnits(): ContentUnitView[] {
    return this.units();
  }

  private loadCatalogs(): void {
    forkJoin({
      unitCatalogs: this.planningApiService.getUnitCatalogs(),
      classCatalogs: this.planningApiService.getClassCatalogs()
    }).subscribe({
      next: ({ unitCatalogs, classCatalogs }) => {
        this.unitCatalogs.set(unitCatalogs);
        this.classCatalogs.set(classCatalogs);
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible cargar los catalogos de contenido')
    });
  }

  private loadContent(): void {
    this.isLoading.set(true);
    const selectedCourse = this.selectedCourse();
    const courseId = selectedCourse === 'all' ? undefined : selectedCourse;
    const semester = this.resolveSemesterNumber(this.selectedSemester());
    const documentType = this.resolveDocumentTypeFilter(this.filter());
    forkJoin({
      summary: this.planningApiService.getPlanningSummary({ courseId, semester, documentType }),
      classes: this.planningApiService.getClasses({ courseId, semester, documentType })
    }).subscribe({
      next: ({ summary, classes }) => {
        this.summary.set(summary);
        this.units.set(this.buildUnits(summary, classes));
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar el contenido academico');
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

    const palette: ContentUnitView['color'][] = ['blue', 'purple', 'green', 'orange'];

    return summary.units.map((unit, index) => {
      const unitClasses = (classesByUnit.get(unit.id) ?? []).map((planningClass) => this.mapClass(planningClass));
      const totalDocuments = unitClasses.reduce((count, contentClass) => count + contentClass.documents.length, 0);

      return {
        id: unit.id,
        courseId: this.resolveCourseId(unit.courseName),
        numberLabel: unit.code,
        title: unit.name,
        courseName: unit.courseName,
        weekLabel: unit.weekRange,
        progress: unit.progressPercent,
        color: palette[index % palette.length],
        expanded: index === 0,
        classes: unitClasses,
        totalDocuments
      };
    });
  }

  private mapClass(planningClass: PlanningClass): ContentClassView {
    return {
      id: planningClass.id,
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
      title: document.originalName,
      type: this.resolveDocumentType(document),
      sizeLabel: this.formatBytes(document.sizeBytes),
      metaLabel: document.visibleToStudents ? 'Visible a estudiantes' : 'Solo docente',
      dateLabel: this.formatDateTime(document.uploadedAt),
      visibilityLabel: document.visibleToStudents ? 'Visible a estudiantes' : 'Solo docente'
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

  private resolveFileName(headers: HttpHeaders): string | null {
    const disposition = headers.get('content-disposition') ?? headers.get('Content-Disposition');
    if (!disposition) {
      return null;
    }
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    return match?.[1] ?? null;
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
