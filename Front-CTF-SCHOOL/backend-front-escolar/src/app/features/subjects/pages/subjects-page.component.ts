import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SubjectApiService } from '../../../core/services/subject-api.service';
import { Subject, SubjectPayload } from '../../../core/models/subject.models';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';
import { SubjectDialogComponent } from '../components/subject-dialog.component';

@Component({
  selector: 'app-subjects-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    SummaryMetricCardComponent,
    TeacherModernLayoutComponent
  ],
  templateUrl: './subjects-page.component.html',
  styleUrl: './subjects-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubjectsPageComponent {
  private readonly subjectApiService = inject(SubjectApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = this.authStateService.user;
  readonly displayedColumns = ['subject', 'teachers', 'referenceLevel', 'status', 'actions'];
  readonly subjects = signal<Subject[]>([]);
  readonly searchTerm = signal('');
  readonly levelFilter = signal<'all' | 'initial' | 'basic' | 'media'>('all');
  readonly hasActiveFilters = computed(() => this.searchTerm().trim().length > 0 || this.levelFilter() !== 'all');
  readonly summaryCards = computed(() => {
    const subjects = this.subjects();
    const totalSuggestedHours = subjects.reduce((total, subject) => total + subject.suggestedHours, 0);
    return [
      {
        label: 'Asignaturas activas',
        value: subjects.length,
        icon: 'library_books',
        tone: 'primary'
      },
      {
        label: 'Areas curriculares',
        value: Array.from(new Set(subjects.map((subject) => subject.area))).length,
        icon: 'category',
        tone: 'success'
      },
      {
        label: 'Niveles de cursos',
        value: Array.from(new Set(subjects.map((subject) => this.getLevelLabel(subject)))).length,
        icon: 'layers',
        tone: 'warning'
      },
      {
        label: 'Horas sugeridas',
        value: totalSuggestedHours,
        icon: 'schedule',
        tone: 'violet'
      }
    ];
  });
  readonly filteredSubjects = computed(() => {
    const currentFilter = this.levelFilter();
    if (currentFilter === 'all') {
      return this.subjects();
    }

    return this.subjects().filter((subject) => {
      if (currentFilter === 'initial') {
        return this.isInitialLevel(subject);
      }
      if (currentFilter === 'basic') {
        return this.isBasicLevel(subject);
      }
      return this.isMediaLevel(subject);
    });
  });

  constructor() {
    this.loadSubjects();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SubjectDialogComponent, {
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      panelClass: 'subject-dialog-panel',
      backdropClass: 'subject-dialog-backdrop'
    });
    dialogRef.afterClosed().subscribe((payload?: SubjectPayload) => {
      if (!payload) {
        return;
      }

      this.subjectApiService.create(payload).subscribe({
        next: () => {
          this.snackBar.open('Asignatura creada correctamente', 'Cerrar', { duration: 2500 });
          this.loadSubjects();
        },
        error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible crear la asignatura')
      });
    });
  }

  openEditDialog(subject: Subject): void {
    const dialogRef = this.dialog.open(SubjectDialogComponent, {
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      panelClass: 'subject-dialog-panel',
      backdropClass: 'subject-dialog-backdrop',
      data: { subject }
    });
    dialogRef.afterClosed().subscribe((payload?: SubjectPayload) => {
      if (!payload) {
        return;
      }

      this.subjectApiService.update(subject.id, payload).subscribe({
        next: () => {
          this.snackBar.open('Asignatura actualizada correctamente', 'Cerrar', { duration: 2500 });
          this.loadSubjects();
        },
        error: (error: HttpErrorResponse) =>
          this.showError(error, 'No fue posible actualizar la asignatura')
      });
    });
  }

  confirmDelete(subject: Subject): void {
    const ref = this.snackBar.open(`Eliminar ${subject.name}?`, 'Confirmar', { duration: 5000 });
    ref.onAction().subscribe(() => {
      this.subjectApiService.delete(subject.id).subscribe({
        next: () => {
          this.snackBar.open('Asignatura eliminada correctamente', 'Cerrar', { duration: 2500 });
          this.loadSubjects();
        },
        error: (error: HttpErrorResponse) =>
          this.showError(error, 'No fue posible eliminar la asignatura')
      });
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.loadSubjects();
  }

  setLevelFilter(level: 'all' | 'initial' | 'basic' | 'media'): void {
    this.levelFilter.set(level);
    this.loadSubjects();
  }

  getLevelLabel(subject: Subject): string {
    const level = subject.displayLevel?.trim() || subject.referenceLevel?.trim();
    return level || 'Sin nivel';
  }

  isInitialLevel(subject: Subject): boolean {
    return this.getNormalizedLevel(subject).includes('inicial');
  }

  isBasicLevel(subject: Subject): boolean {
    return this.getNormalizedLevel(subject).includes('basic');
  }

  isMediaLevel(subject: Subject): boolean {
    return this.getNormalizedLevel(subject).includes('media');
  }

  private loadSubjects(): void {
    this.subjectApiService.findAll({
      search: this.searchTerm()
    }).subscribe({
      next: (subjects) => this.subjects.set(subjects),
      error: (error: HttpErrorResponse) =>
        this.showError(error, 'No fue posible cargar las asignaturas')
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3500
    });
  }

  private getNormalizedLevel(subject: Subject): string {
    return this.getLevelLabel(subject)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
