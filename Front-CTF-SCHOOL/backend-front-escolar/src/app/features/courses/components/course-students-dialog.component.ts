import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EnrollmentListItem } from '../../../core/models/enrollment.models';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';

interface CourseStudentsDialogData {
  courseId: number;
  courseName: string;
  courseCode: string;
  students: EnrollmentListItem[];
}

@Component({
  selector: 'app-course-students-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <section class="students-dialog">
      <header class="students-dialog__header">
        <div class="students-dialog__header-copy">
          <p class="students-dialog__eyebrow">Gestion de alumnos</p>
          <h2>{{ data.courseName }}</h2>
          <span>{{ data.courseCode }} · {{ students().length }} alumno{{ students().length === 1 ? '' : 's' }}</span>
        </div>
        <button mat-icon-button type="button" (click)="close()" aria-label="Cerrar listado">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <section class="students-dialog__search">
        <label class="students-search">
          <mat-icon>search</mat-icon>
          <input
            type="text"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
            placeholder="Buscar alumno..." />
        </label>
      </section>

      <section class="students-dialog__body">
        @if (isLoading()) {
          <div class="students-dialog__empty">
            <mat-icon>hourglass_top</mat-icon>
            <strong>Cargando alumnos del curso</strong>
            <p>Estamos consultando la informacion real de matriculas.</p>
          </div>
        } @else if (filteredStudents().length === 0) {
          <div class="students-dialog__empty">
            <mat-icon>groups</mat-icon>
            <strong>No hay alumnos para mostrar</strong>
            <p>Ajusta la busqueda o revisa las matriculas del curso.</p>
          </div>
        } @else {
          <div class="students-list">
            @for (student of filteredStudents(); track student.id) {
              <article class="student-row">
                <div class="student-row__avatar">
                  {{ initials(student.fullName) }}
                </div>
                <div class="student-row__main">
                  <strong>{{ student.fullName }}</strong>
                  <span>{{ student.studentRun }}</span>
                </div>
                <div class="student-row__meta">
                  <span class="student-row__status">{{ student.status }}</span>
                  <button
                    type="button"
                    class="student-row__remove"
                    [disabled]="deletingEnrollmentId() === student.id"
                    (click)="requestDelete(student)"
                    aria-label="Eliminar alumno del curso">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </article>
            }
          </div>
        }
      </section>

      @if (pendingDelete()) {
        <section class="students-dialog__confirm-backdrop">
          <div class="students-dialog__confirm">
            <div class="students-dialog__confirm-icon">
              <mat-icon>warning</mat-icon>
            </div>

            <div class="students-dialog__confirm-copy">
              <strong>Quitar alumno del curso</strong>
              <p>
                {{ pendingDelete()?.fullName }} dejara de estar matriculado en {{ data.courseName }}.
              </p>
            </div>

            <div class="students-dialog__confirm-actions">
              <button mat-stroked-button type="button" (click)="cancelDelete()">Cancelar</button>
              <button
                mat-flat-button
                type="button"
                class="students-dialog__confirm-danger"
                [disabled]="isDeleting()"
                (click)="confirmDelete()">
                Eliminar
              </button>
            </div>
          </div>
        </section>
      }

      <footer class="students-dialog__footer">
        <button mat-stroked-button type="button" (click)="close()">Cerrar</button>
      </footer>
    </section>
  `,
  styles: `
    .students-dialog {
      position: relative;
      width: min(620px, 82vw);
      border-radius: 20px;
      border: 1px solid #e5ecf4;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      padding: 0.95rem 0.95rem 0.9rem;
      color: #173553;
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
    }

    .students-dialog__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.8rem;
      border-bottom: 1px solid #edf2f7;
    }

    .students-dialog__header-copy {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
    }

    .students-dialog__eyebrow {
      margin: 0;
      color: #7b8da8;
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .students-dialog__header h2 {
      margin: 0;
      font-size: 1.02rem;
      line-height: 1.15;
      font-weight: 800;
      color: #12233d;
    }

    .students-dialog__header span {
      display: block;
      color: #6e819c;
      font-size: 0.74rem;
      font-weight: 600;
    }

    .students-dialog__header button {
      width: 34px;
      height: 34px;
      color: #6f829a;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
      flex-shrink: 0;
    }

    .students-dialog__search {
      margin-bottom: 0.75rem;
    }

    .students-search {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-height: 36px;
      padding: 0 0.72rem;
      border-radius: 10px;
      border: 1.5px solid #dbe5f0;
      background: #f8fbff;
      transition: 0.2s ease;
    }

    .students-search .mat-icon {
      width: 17px;
      height: 17px;
      font-size: 17px;
      color: #9aa9bf;
    }

    .students-search:focus-within {
      border-color: #c8d7ea;
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }

    .students-search input {
      width: 100%;
      border: 0;
      outline: 0;
      background: transparent;
      color: #485d77;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .students-dialog__body {
      max-height: min(50vh, 430px);
      overflow: auto;
      padding-right: 0.15rem;
    }

    .students-list {
      display: grid;
      gap: 0.42rem;
    }

    .student-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.72rem;
      padding: 0.72rem 0.82rem;
      border-radius: 14px;
      border: 1px solid #e5ecf4;
      background: #ffffff;
      transition: all 0.18s ease;
    }

    .student-row:hover {
      border-color: #d6e1ec;
      background: #f8fbff;
    }

    .student-row__avatar {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: #e9f0fb;
      color: #3b82f6;
      display: grid;
      place-items: center;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      flex-shrink: 0;
    }

    .student-row__main {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
    }

    .student-row__main strong {
      color: #173553;
      font-size: 0.84rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .student-row__main span {
      color: #7b8da8;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .student-row__meta {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .student-row__status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 30px;
      padding: 0 0.66rem;
      border-radius: 999px;
      background: #ecfdf5;
      color: #0f9d6b;
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .student-row__remove {
      width: 30px;
      height: 30px;
      border: 1px solid #fee2e2;
      border-radius: 9px;
      background: #ffffff;
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .student-row__remove:hover:not(:disabled) {
      background: #ef4444;
      border-color: #ef4444;
      color: #ffffff;
    }

    .student-row__remove:disabled {
      opacity: 0.55;
      cursor: default;
    }

    .student-row__remove .mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }

    .students-dialog__empty {
      min-height: 190px;
      display: grid;
      place-items: center;
      gap: 0.42rem;
      text-align: center;
      color: #6c7f98;
    }

    .students-dialog__empty .mat-icon {
      width: 36px;
      height: 36px;
      font-size: 36px;
      color: #3b82f6;
    }

    .students-dialog__empty strong {
      color: #173553;
      font-size: 0.84rem;
    }

    .students-dialog__empty p {
      margin: 0;
      font-size: 0.74rem;
      font-weight: 600;
    }

    .students-dialog__confirm-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(4px);
      display: grid;
      place-items: center;
      padding: 1rem;
      border-radius: 20px;
    }

    .students-dialog__confirm {
      width: min(380px, 100%);
      display: grid;
      gap: 0.75rem;
      padding: 0.95rem;
      border-radius: 18px;
      background: #ffffff;
      border: 1px solid #f5d4d4;
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
    }

    .students-dialog__confirm-icon {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: #fef2f2;
      color: #ef4444;
      display: grid;
      place-items: center;
    }

    .students-dialog__confirm-copy {
      display: grid;
      gap: 0.28rem;
    }

    .students-dialog__confirm-copy strong {
      color: #12233d;
      font-size: 0.88rem;
      font-weight: 800;
    }

    .students-dialog__confirm-copy p {
      margin: 0;
      color: #5f738d;
      font-size: 0.78rem;
      line-height: 1.45;
      font-weight: 600;
    }

    .students-dialog__confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .students-dialog__confirm-actions button,
    .students-dialog__footer button {
      min-height: 40px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .students-dialog__confirm-danger {
      background: #ef4444;
      color: #ffffff;
    }

    .students-dialog__footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.8rem;
      padding-top: 0.8rem;
      border-top: 1px solid #edf2f7;
    }

    @media (max-width: 720px) {
      .students-dialog {
        width: min(96vw, 96vw);
        padding: 0.9rem;
      }

      .student-row {
        grid-template-columns: 1fr;
        align-items: flex-start;
      }

      .student-row__meta {
        width: 100%;
        justify-content: space-between;
      }

      .students-dialog__confirm-actions,
      .students-dialog__footer {
        grid-auto-flow: row;
      }

      .students-dialog__confirm-actions button,
      .students-dialog__footer button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseStudentsDialogComponent {
  protected readonly data = inject<CourseStudentsDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CourseStudentsDialogComponent>);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly search = signal('');
  readonly students = signal<EnrollmentListItem[]>(this.data.students);
  readonly pendingDelete = signal<EnrollmentListItem | null>(null);
  readonly deletingEnrollmentId = signal<number | null>(null);
  readonly hasChanges = signal(false);
  readonly isLoading = signal(false);
  readonly isDeleting = computed(() => this.deletingEnrollmentId() !== null);

  readonly filteredStudents = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.students();
    }

    return this.students().filter((student) =>
      student.fullName.toLowerCase().includes(query) || student.studentRun.toLowerCase().includes(query)
    );
  });

  constructor() {
    this.loadStudents();
  }

  initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  requestDelete(student: EnrollmentListItem): void {
    this.pendingDelete.set(student);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const student = this.pendingDelete();
    if (!student) {
      return;
    }

    this.deletingEnrollmentId.set(student.id);
    this.enrollmentApiService.delete(student.id).subscribe({
      next: () => {
        this.students.update((items) => items.filter((item) => item.id !== student.id));
        this.pendingDelete.set(null);
        this.deletingEnrollmentId.set(null);
        this.hasChanges.set(true);
        this.snackBar.open('Alumno eliminado del curso correctamente', 'Cerrar', { duration: 2600 });
      },
      error: (error: HttpErrorResponse) => {
        this.deletingEnrollmentId.set(null);
        this.snackBar.open(
          typeof error.error?.message === 'string' ? error.error.message : 'No fue posible eliminar el alumno del curso',
          'Cerrar',
          { duration: 3600 }
        );
      }
    });
  }

  private loadStudents(): void {
    this.isLoading.set(true);
    this.enrollmentApiService.getOverview({ courseId: this.data.courseId }).subscribe({
      next: (overview) => {
        this.students.set(overview.enrollments.filter((enrollment) => enrollment.courseId === this.data.courseId));
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.snackBar.open(
          typeof error.error?.message === 'string' ? error.error.message : 'No fue posible cargar los alumnos del curso',
          'Cerrar',
          { duration: 3600 }
        );
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.hasChanges());
  }
}
