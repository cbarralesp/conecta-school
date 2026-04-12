import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { SubjectApiService } from '../../../core/services/subject-api.service';
import { Subject, SubjectPayload } from '../../../core/models/subject.models';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';
import { SubjectDialogComponent } from '../components/subject-dialog.component';

@Component({
  selector: 'app-subjects-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatToolbarModule,
    TeacherSideMenuComponent
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
  private readonly router = inject(Router);

  readonly displayedColumns = ['code', 'name', 'area', 'referenceLevel', 'suggestedHours', 'colorHex', 'actions'];
  readonly subjects = signal<Subject[]>([]);

  constructor() {
    this.loadSubjects();
  }

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SubjectDialogComponent, {
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false
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

  private loadSubjects(): void {
    this.subjectApiService.findAll().subscribe({
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
}
