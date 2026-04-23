import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import {
  DocumentItem,
  PlanningDocument,
  PlanningDocumentFileType,
  PlanningDocumentTree,
  SubjectGroup,
  UnitGroup
} from '../../../core/models/planning.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PlanningApiService } from '../../../core/services/planning-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import { PlanningDocumentsToolbarComponent } from '../components/planning-documents-toolbar.component';
import { PlanningSubjectCardComponent } from '../components/planning-subject-card.component';

type DocumentTypeFilter = 'ALL' | PlanningDocumentFileType;
type DocumentViewMode = 'grid' | 'list';

@Component({
  selector: 'app-planning-documents',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent,
    PlanningDocumentsToolbarComponent,
    PlanningSubjectCardComponent
  ],
  templateUrl: './planning-documents.component.html',
  styleUrl: './planning-documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningDocumentsComponent {
  private readonly planningApiService = inject(PlanningApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly user = this.authStateService.user;
  readonly isLoading = signal(true);
  readonly isDeleting = signal<number | null>(null);
  readonly documents = signal<PlanningDocument[]>([]);
  readonly activeType = signal<DocumentTypeFilter>('ALL');
  readonly viewMode = signal<DocumentViewMode>('grid');
  readonly selectedSubjectId = signal<number | 'ALL'>('ALL');
  readonly selectedSemester = signal<string>('ALL');
  readonly searchTerm = signal('');

  readonly typeChips = computed(() => {
    const documents = this.documents();
    return [
      { code: 'ALL' as const, label: 'Todos', count: documents.length },
      { code: 'PDF' as const, label: 'PDF', count: documents.filter((item) => item.fileType === 'PDF').length },
      { code: 'WORD' as const, label: 'Word', count: documents.filter((item) => item.fileType === 'WORD').length },
      { code: 'PPT' as const, label: 'PPT', count: documents.filter((item) => item.fileType === 'PPT').length }
    ];
  });

  readonly subjectOptions = computed(() => {
    const subjectMap = new Map<number, string>();
    for (const document of this.documents()) {
      if (document.subjectId != null && document.subjectName) {
        subjectMap.set(document.subjectId, document.subjectName);
      }
    }
    return Array.from(subjectMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  });

  readonly semesterOptions = computed(() => {
    const options = new Set<string>();
    for (const document of this.documents()) {
      options.add(this.resolveSemesterLabel(document.uploadedAt));
    }
    return Array.from(options).sort();
  });

  readonly filteredDocuments = computed(() => {
    let items = this.documents();

    if (this.activeType() !== 'ALL') {
      items = items.filter((item) => item.fileType === this.activeType());
    }

    if (this.selectedSubjectId() !== 'ALL') {
      items = items.filter((item) => item.subjectId === this.selectedSubjectId());
    }

    if (this.selectedSemester() !== 'ALL') {
      items = items.filter((item) => this.resolveSemesterLabel(item.uploadedAt) === this.selectedSemester());
    }

    const query = this.searchTerm().trim().toLowerCase();
    if (query) {
      items = items.filter((item) =>
        [
          item.originalName,
          item.subjectName,
          item.unitName,
          item.unitNumberLabel,
          item.classTitle,
          item.courseName
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query))
      );
    }

    return items;
  });

  readonly documentTree = computed<PlanningDocumentTree>(() => ({
    subjects: this.buildTree(this.filteredDocuments())
  }));

  constructor() {
    this.loadDocuments();
  }

  download(document: DocumentItem): void {
    this.planningApiService.downloadPlanningDocument(document.id).subscribe({
      next: (response) => {
        const filename = this.resolveFileName(response, document.name);
        const objectUrl = URL.createObjectURL(response.body!);
        const anchor = window.document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: (error: HttpErrorResponse) => {
        this.snackBar.open(
          typeof error.error?.message === 'string' ? error.error.message : 'No fue posible descargar el documento',
          'Cerrar',
          { duration: 3200 }
        );
      }
    });
  }

  delete(document: DocumentItem): void {
    const confirmed = window.confirm(`Eliminar "${document.name}" del banco de documentos?`);
    if (!confirmed || this.isDeleting() === document.id) {
      return;
    }

    this.isDeleting.set(document.id);
    this.planningApiService.deletePlanningDocument(document.id).subscribe({
      next: () => {
        this.documents.update((current) => current.filter((item) => item.id !== document.id));
        this.isDeleting.set(null);
        this.snackBar.open('Documento eliminado correctamente', 'Cerrar', { duration: 2800 });
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(null);
        this.snackBar.open(
          typeof error.error?.message === 'string' ? error.error.message : 'No fue posible eliminar el documento',
          'Cerrar',
          { duration: 3200 }
        );
      }
    });
  }

  goToUpload(): void {
    this.router.navigateByUrl('/dashboard/planificacion/nueva-clase');
  }

  private loadDocuments(): void {
    this.planningApiService.getPlanningDocuments().subscribe({
      next: (documents) => {
        this.documents.set(documents);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string' ? error.error.message : 'No fue posible cargar el banco de documentos',
          'Cerrar',
          { duration: 3500 }
        );
      }
    });
  }

  private buildTree(documents: PlanningDocument[]): SubjectGroup[] {
    const subjects = new Map<string, SubjectGroup>();

    for (const document of documents) {
      const subjectId = document.subjectId ?? -1;
      const subjectKey = `${subjectId}-${document.subjectName}`;
      const semesterLabel = this.resolveSemesterLabel(document.uploadedAt);

      if (!subjects.has(subjectKey)) {
        subjects.set(subjectKey, {
          id: subjectKey,
          subjectId: document.subjectId,
          subjectName: document.subjectName || 'Sin asignatura',
          semesterLabel,
          totalUnits: 0,
          totalDocuments: 0,
          visibleDocuments: 0,
          teacherOnlyDocuments: 0,
          units: []
        });
      }

      const subject = subjects.get(subjectKey)!;
      subject.totalDocuments += 1;
      if (document.visibleToStudents) {
        subject.visibleDocuments += 1;
      } else {
        subject.teacherOnlyDocuments += 1;
      }

      const unitKey = `${document.unitId ?? 'none'}-${document.unitNumberLabel}-${document.unitName}`;
      let unit = subject.units.find((item) => item.id === unitKey);
      if (!unit) {
        unit = {
          id: unitKey,
          unitId: document.unitId,
          unitCode: document.unitNumberLabel || 'Unidad',
          unitName: document.unitName || 'Sin unidad',
          courseName: document.courseName || 'Sin curso',
          totalDocuments: 0,
          visibleDocuments: 0,
          progressPercent: 0,
          documents: []
        };
        subject.units.push(unit);
      }

      const item: DocumentItem = {
        id: document.id,
        unitId: document.unitId,
        classId: document.classId,
        name: document.originalName,
        extension: document.extension,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        type: document.fileType,
        origin: document.origin,
        uploadedAt: document.uploadedAt,
        subjectId: document.subjectId,
        subjectName: document.subjectName,
        courseName: document.courseName,
        unitNumberLabel: document.unitNumberLabel,
        unitName: document.unitName,
        classTitle: document.classTitle,
        createdBy: document.createdBy,
        visibleToStudents: document.visibleToStudents,
        visibilityLabel: document.visibleToStudents ? 'Disponible' : 'Solo docente',
        freshnessLabel: this.isNewDocument(document.uploadedAt) ? 'Nuevo' : ''
      };

      unit.documents.push(item);
      unit.totalDocuments += 1;
      if (document.visibleToStudents) {
        unit.visibleDocuments += 1;
      }
    }

    const subjectGroups = Array.from(subjects.values())
      .map((subject) => {
        subject.units = subject.units
          .map((unit) => ({
            ...unit,
            progressPercent:
              unit.totalDocuments <= 0 ? 0 : Math.round((unit.visibleDocuments / unit.totalDocuments) * 100),
            documents: [...unit.documents].sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
          }))
          .sort((left, right) => left.unitCode.localeCompare(right.unitCode, undefined, { numeric: true }));

        subject.totalUnits = subject.units.length;
        return subject;
      })
      .sort((left, right) => left.subjectName.localeCompare(right.subjectName));

    return subjectGroups;
  }

  private resolveSemesterLabel(dateIso: string): string {
    const date = new Date(dateIso);
    const semester = date.getMonth() + 1 <= 6 ? '1° Semestre' : '2° Semestre';
    return `${semester} ${date.getFullYear()}`;
  }

  private isNewDocument(dateIso: string): boolean {
    const uploadedTime = new Date(dateIso).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - uploadedTime <= sevenDays;
  }

  private resolveFileName(response: HttpResponse<Blob>, fallbackName: string): string {
    const header = response.headers.get('content-disposition');
    const match = header?.match(/filename=\"?([^\"]+)\"?/i);
    return match?.[1] ?? fallbackName;
  }
}
