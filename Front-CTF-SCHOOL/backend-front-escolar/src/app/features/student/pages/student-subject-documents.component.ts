import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  StudentDocumentTypeFilter,
  StudentSubjectClassItem,
  StudentSubjectDocumentItem,
  StudentSubjectDocumentsResponse,
  StudentSubjectUnitItem
} from '../../../core/models/student.models';
import { AuthService } from '../../../core/services/auth.service';
import { StudentApiService } from '../../../core/services/student-api.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type DocumentFilterCode = StudentDocumentTypeFilter['code'];

@Component({
  selector: 'app-student-subject-documents',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TeacherModernLayoutComponent
  ],
  templateUrl: './student-subject-documents.component.html',
  styleUrl: './student-subject-documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentSubjectDocumentsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly studentApiService = inject(StudentApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(true);
  readonly documentsView = signal<StudentSubjectDocumentsResponse | null>(null);
  readonly activeFilter = signal<DocumentFilterCode>('TODOS');
  readonly searchTerm = signal('');
  readonly studentDisplayName = signal('Estudiante');

  readonly visibleUnits = computed(() => {
    const response = this.documentsView();
    if (!response) {
      return [];
    }

    const searchValue = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();

    return response.units
      .map((unit) => {
        const classes = unit.classes
          .map((subjectClass) => ({
            ...subjectClass,
            documents: subjectClass.documents.filter((document) => this.matchesDocument(document, filter, searchValue))
          }))
          .filter((subjectClass) => subjectClass.documents.length > 0);

        if (classes.length === 0) {
          return null;
        }

        return {
          ...unit,
          classes
        };
      })
      .filter((unit): unit is StudentSubjectUnitItem => unit !== null);
  });

  readonly totalVisibleDocuments = computed(() =>
    this.visibleUnits().reduce(
      (sum, unit) => sum + unit.classes.reduce((classSum, subjectClass) => classSum + subjectClass.documents.length, 0),
      0
    )
  );

  constructor() {
    this.studentApiService.getDashboard().subscribe({
      next: (dashboard) => {
        this.studentDisplayName.set(dashboard.studentName || 'Estudiante');
      },
      error: () => {
        this.studentDisplayName.set('Estudiante');
      }
    });

    this.route.paramMap.subscribe((params) => {
      const subjectId = Number(params.get('subjectId'));
      if (!Number.isFinite(subjectId) || subjectId <= 0) {
        void this.router.navigate(['/alumno/asignaturas']);
        return;
      }

      this.loadSubjectDocuments(subjectId);
    });
  }

  ngOnDestroy(): void {
    // No persistent object URLs are kept after each action.
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  setFilter(filter: DocumentFilterCode): void {
    this.activeFilter.set(filter);
  }

  formatTeacherName(name: string): string {
    const clean = (name ?? '').trim().replace(/\s+/g, ' ');
    if (!clean) {
      return 'Docente asignado';
    }

    const parts = clean.split(' ');
    if (parts.length <= 2) {
      return clean;
    }

    return `${parts[0]} ${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
  }

  weeklyBlocksLabel(blocks: number): string {
    if (blocks <= 0) {
      return 'Sin bloques asignados';
    }

    return `${blocks} ${blocks === 1 ? 'bloque' : 'bloques'} / semana`;
  }

  openDocument(document: StudentSubjectDocumentItem): void {
    this.markReviewed(document.documentId);
    this.studentApiService.downloadStudentDocument(document.documentId).subscribe({
      next: (response) => {
        if (!response.body) {
          return;
        }

        const url = URL.createObjectURL(response.body);
        window.open(url, '_blank', 'noopener');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.snackBar.open('No fue posible abrir el documento', 'Cerrar', { duration: 3200 });
      }
    });
  }

  downloadDocument(document: StudentSubjectDocumentItem): void {
    this.studentApiService.downloadStudentDocument(document.documentId).subscribe({
      next: (response) => {
        if (!response.body) {
          return;
        }

        const url = URL.createObjectURL(response.body);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = this.resolveDownloadFileName(response, document.fileName);
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.snackBar.open('No fue posible descargar el documento', 'Cerrar', { duration: 3200 });
      }
    });
  }

  trackUnit(_: number, unit: StudentSubjectUnitItem): number {
    return unit.unitId;
  }

  trackClass(_: number, subjectClass: StudentSubjectClassItem): string {
    return `${subjectClass.classId ?? 'unit'}-${subjectClass.classTitle}`;
  }

  trackDocument(_: number, document: StudentSubjectDocumentItem): number {
    return document.documentId;
  }

  private resolveDownloadFileName(response: { headers?: { get(name: string): string | null } }, fallback: string): string {
    const disposition = response.headers?.get('content-disposition');
    const headerFileName = disposition ? this.extractFileNameFromDisposition(disposition) : null;
    return headerFileName || fallback || 'documento';
  }

  private extractFileNameFromDisposition(disposition: string): string | null {
    const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
      try {
        return decodeURIComponent(encodedMatch[1].replace(/"/g, '').trim());
      } catch {
        return encodedMatch[1].replace(/"/g, '').trim();
      }
    }

    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    return plainMatch?.[1]?.trim() || null;
  }

  private loadSubjectDocuments(subjectId: number): void {
    this.isLoading.set(true);

    this.studentApiService.getStudentSubjectDocuments(subjectId).subscribe({
      next: (response) => {
        this.documentsView.set(response);
        this.activeFilter.set('TODOS');
        this.searchTerm.set('');
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No fue posible cargar los documentos de la asignatura',
          'Cerrar',
          { duration: 3600 }
        );
        void this.router.navigate(['/alumno/asignaturas']);
      }
    });
  }

  private matchesDocument(
    document: StudentSubjectDocumentItem,
    filter: DocumentFilterCode,
    searchValue: string
  ): boolean {
    const matchesType = filter === 'TODOS' || document.fileType === filter;
    const matchesSearch =
      searchValue.length === 0 ||
      document.fileName.toLowerCase().includes(searchValue) ||
      document.metaLabel.toLowerCase().includes(searchValue);

    return matchesType && matchesSearch;
  }

  private markReviewed(documentId: number): void {
    this.patchDocumentReviewed(documentId);

    this.studentApiService.markDocumentReviewed(documentId).subscribe({
      error: () => {
        this.snackBar.open('No fue posible marcar el documento como revisado', 'Cerrar', { duration: 2600 });
      }
    });
  }

  private patchDocumentReviewed(documentId: number): void {
    const current = this.documentsView();
    if (!current) {
      return;
    }

    let reviewedChanged = false;
    const nextUnits = current.units.map((unit) => ({
      ...unit,
      classes: unit.classes.map((subjectClass) => {
        const documents = subjectClass.documents.map((document) => {
          if (document.documentId !== documentId || document.reviewed) {
            return document;
          }

          reviewedChanged = true;
          return {
            ...document,
            reviewed: true,
            isNew: false
          };
        });

        return {
          ...subjectClass,
          hasNewDocuments: documents.some((document) => document.isNew),
          documents
        };
      })
    }));

    if (!reviewedChanged) {
      return;
    }

    this.documentsView.set({
      ...current,
      metrics: {
        ...current.metrics,
        reviewedDocuments: current.metrics.reviewedDocuments + 1,
        newDocuments: Math.max(0, current.metrics.newDocuments - 1)
      },
      units: nextUnits
    });
  }
}
