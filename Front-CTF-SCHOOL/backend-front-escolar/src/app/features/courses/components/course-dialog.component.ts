import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { Course, CoursePayload, StudentCatalogItem } from '../../../core/models/course.models';
import { EnrollmentListItem } from '../../../core/models/enrollment.models';
import { CourseApiService } from '../../../core/services/course-api.service';
import { EnrollmentApiService } from '../../../core/services/enrollment-api.service';

interface CourseDialogData {
  course?: Course;
}

@Component({
  selector: 'app-course-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <section class="dialog-panel">
      <header class="dialog-panel__header">
        <div>
          <span class="dialog-panel__eyebrow">Cursos</span>
          <h2>{{ data.course ? 'Editar curso' : 'Nuevo curso' }}</h2>
          <p>{{ data.course ? 'Actualiza la configuracion y la asignacion de alumnos del curso.' : 'Configura el curso y define su informacion principal.' }}</p>
        </div>
        <button type="button" class="dialog-panel__close" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="dialog-panel__body">
        <section class="dialog-section">
          <div class="dialog-section__title">
            <h3>Configuracion principal</h3>
          </div>

          <form [formGroup]="form" class="dialog-form">
            <label class="dialog-field">
              <span>Codigo</span>
              <input type="text" formControlName="code" />
            </label>

            <label class="dialog-field">
              <span>Curso</span>
              <input type="text" formControlName="name" />
            </label>

            <label class="dialog-field">
              <span>Nivel</span>
              <input type="text" formControlName="level" />
            </label>

            <label class="dialog-field">
              <span>Paralelo</span>
              <input type="text" formControlName="letter" maxlength="1" />
            </label>

            <label class="dialog-field">
              <span>Ano escolar</span>
              <input type="number" formControlName="schoolYear" />
            </label>

            <label class="dialog-field">
              <span>Jornada</span>
              <input type="text" formControlName="scheduleType" />
            </label>
          </form>
        </section>

        @if (data.course) {
          <section class="dialog-section">
            <div class="dialog-section__title dialog-section__title--spaced">
              <div>
                <h3>Asignar alumnos</h3>
                <p>{{ selectedStudents().length }} seleccionados · {{ availableStudents().length }} disponibles</p>
              </div>

              <label class="students-search">
                <mat-icon>search</mat-icon>
                <input
                  type="text"
                  [value]="studentSearch()"
                  (input)="studentSearch.set($any($event.target).value)"
                  placeholder="Buscar alumno..." />
              </label>
            </div>

            <div class="assignment-layout">
              <section class="assignment-list-box">
                <header class="assignment-list-header">
                  <h4>Disponibles</h4>
                  <span>{{ filteredAvailableStudents().length }}</span>
                </header>

                <div class="assignment-list-body">
                  @if (isLoadingStudents()) {
                    <p class="assignment-empty">Cargando alumnos...</p>
                  } @else if (filteredAvailableStudents().length === 0) {
                    <p class="assignment-empty">No hay alumnos disponibles.</p>
                  } @else {
                    @for (student of filteredAvailableStudents(); track student.id) {
                      <button
                        type="button"
                        class="assignment-student-row"
                        [class.is-selected]="checkedAvailableIds().includes(student.id)"
                        (click)="toggleAvailableStudent(student.id)">
                        <div>
                          <strong>{{ student.fullName }}</strong>
                          <span>{{ student.run }}</span>
                        </div>
                        <small>{{ student.age > 0 ? student.age + ' anos' : 'Sin edad' }}</small>
                      </button>
                    }
                  }
                </div>
              </section>

              <div class="assignment-controls">
                <button type="button" class="assignment-circle-btn" (click)="moveCheckedToSelected()">&gt;&gt;</button>
                <button type="button" class="assignment-circle-btn" (click)="moveCheckedToAvailable()">&lt;&lt;</button>
              </div>

              <section class="assignment-list-box assignment-list-box--selected">
                <header class="assignment-list-header assignment-list-header--selected">
                  <h4>Seleccionados</h4>
                  <span>{{ filteredSelectedStudents().length }}</span>
                </header>

                <div class="assignment-list-body">
                  @if (filteredSelectedStudents().length === 0) {
                    <p class="assignment-empty">Todavia no hay alumnos seleccionados.</p>
                  } @else {
                    @for (student of filteredSelectedStudents(); track student.id) {
                      <button
                        type="button"
                        class="assignment-student-row assignment-student-row--selected"
                        [class.is-selected]="checkedSelectedIds().includes(student.id)"
                        (click)="toggleSelectedStudent(student.id)">
                        <div>
                          <strong>{{ student.fullName }}</strong>
                          <span>{{ student.run }}</span>
                        </div>
                        <small>{{ student.age > 0 ? student.age + ' anos' : 'Asignado' }}</small>
                      </button>
                    }
                  }
                </div>
              </section>
            </div>
          </section>
        }
      </div>

      <footer class="dialog-panel__footer">
        <button mat-stroked-button type="button" class="header-button header-button--ghost" (click)="dialogRef.close()">Cancelar</button>
        <button mat-flat-button type="button" class="header-button header-button--primary" (click)="submit()">
          {{ data.course ? 'Guardar cambios' : 'Crear curso' }}
        </button>
      </footer>
    </section>
  `,
  styles: `
    .dialog-panel {
      width: min(980px, 92vw);
      border-radius: 24px;
      background: #ffffff;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
      overflow: hidden;
      display: grid;
    }

    .dialog-panel__header,
    .dialog-panel__footer {
      padding: 1rem 1.1rem;
    }

    .dialog-panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid #edf3fa;
      background: linear-gradient(180deg, #fbfdff 0%, #f5f9ff 100%);
    }

    .dialog-panel__eyebrow {
      display: inline-flex;
      margin-bottom: 0.22rem;
      color: #3b82f6;
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .dialog-panel__header h2 {
      margin: 0;
      color: #102849;
      font-size: 1.2rem;
      font-weight: 800;
    }

    .dialog-panel__header p {
      margin: 0.18rem 0 0;
      color: #6f84a3;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .dialog-panel__close {
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: #7a8ea9;
      cursor: pointer;
    }

    .dialog-panel__body {
      padding: 1rem 1.1rem;
      display: grid;
      gap: 1rem;
      max-height: min(82vh, 820px);
      overflow: auto;
    }

    .dialog-section {
      display: grid;
      gap: 0.85rem;
    }

    .dialog-section__title h3 {
      margin: 0;
      color: #173553;
      font-size: 0.95rem;
      font-weight: 800;
    }

    .dialog-section__title--spaced {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .dialog-section__title--spaced p {
      margin: 0.16rem 0 0;
      color: #7890b0;
      font-size: 0.76rem;
      font-weight: 600;
    }

    .dialog-form {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .dialog-field {
      display: grid;
      gap: 0.38rem;
    }

    .dialog-field span {
      color: #425e80;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .dialog-field input {
      min-height: 50px;
      padding: 0 0.9rem;
      border: 1.5px solid #d4e0ef;
      border-radius: 14px;
      background: #f8fbff;
      color: #354f70;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      outline: 0;
    }

    .students-search {
      min-height: 44px;
      min-width: 280px;
      padding: 0 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      border-radius: 14px;
      background: #f8fbff;
      box-shadow: inset 0 0 0 1.5px #d3e0ef;
    }

    .students-search .mat-icon {
      color: #98a8c1;
    }

    .students-search input {
      width: 100%;
      border: 0;
      outline: 0;
      background: transparent;
      color: #3f5f82;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .assignment-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      gap: 0.8rem;
      align-items: center;
    }

    .assignment-list-box {
      border: 1px solid #e5e7eb;
      border-radius: 0.95rem;
      overflow: hidden;
      background: #ffffff;
      min-height: 24rem;
    }

    .assignment-list-box--selected {
      border-color: #6366f1;
    }

    .assignment-list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.76rem 0.95rem;
      border-bottom: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .assignment-list-header h4 {
      margin: 0;
      color: #1f2937;
      font-size: 0.82rem;
      font-weight: 800;
    }

    .assignment-list-header span {
      color: #1f2937;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .assignment-list-header--selected {
      background: #eef2ff;
    }

    .assignment-list-header--selected h4,
    .assignment-list-header--selected span {
      color: #4338ca;
    }

    .assignment-list-body {
      display: grid;
      gap: 0;
      max-height: 19rem;
      min-height: 19rem;
      overflow: auto;
      padding: 0;
    }

    .assignment-student-row {
      width: 100%;
      padding: 0.7rem 0.85rem;
      border: 0;
      border-bottom: 1px solid #eef2f7;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .assignment-student-row div {
      display: grid;
      gap: 0.16rem;
      min-width: 0;
    }

    .assignment-student-row strong {
      color: #243043;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .assignment-student-row span,
    .assignment-student-row small {
      color: #4b5563;
      font-size: 0.76rem;
      font-weight: 500;
    }

    .assignment-student-row:hover {
      background: #eef2ff;
    }

    .assignment-student-row.is-selected {
      background: #e0e7ff;
      box-shadow: inset 3px 0 0 #4338ca;
    }

    .assignment-student-row--selected:hover {
      background: #f5f3ff;
    }

    .assignment-empty {
      margin: auto;
      padding: 0.95rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.78rem;
    }

    .assignment-controls {
      display: grid;
      gap: 0.7rem;
      align-content: center;
    }

    .assignment-circle-btn {
      width: 2.45rem;
      height: 2.45rem;
      border-radius: 999px;
      border: 1px solid #d9dde5;
      background: #ffffff;
      color: #111827;
      font-size: 0.88rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .assignment-circle-btn:hover {
      background: #eef2ff;
      border-color: #6366f1;
      color: #4338ca;
    }

    .dialog-panel__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      border-top: 1px solid #edf3fa;
    }

    .header-button {
      min-height: 42px !important;
      border-radius: 14px !important;
      padding-inline: 1.2rem !important;
      font-size: 0.82rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .header-button--ghost {
      border-color: #d8e3ef !important;
      color: #51667f !important;
    }

    .header-button--primary {
      background: #0f9d6b !important;
      color: #fff !important;
    }

    @media (max-width: 960px) {
      .dialog-form {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .assignment-layout {
        grid-template-columns: 1fr;
      }

      .assignment-list-box {
        min-height: 16rem;
      }

      .assignment-list-body {
        min-height: 14rem;
        max-height: 14rem;
      }

      .assignment-controls {
        grid-auto-flow: column;
        justify-content: center;
      }
    }

    @media (max-width: 720px) {
      .dialog-panel {
        width: calc(100% - 1rem);
      }

      .dialog-form {
        grid-template-columns: 1fr;
      }

      .students-search {
        min-width: 0;
        width: 100%;
      }

      .dialog-panel__footer {
        flex-direction: column;
      }

      .dialog-panel__footer .header-button {
        width: 100%;
        justify-content: center;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly courseApiService = inject(CourseApiService);
  private readonly enrollmentApiService = inject(EnrollmentApiService);
  readonly dialogRef = inject(MatDialogRef<CourseDialogComponent>);
  readonly data = inject<CourseDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.nonNullable.group({
    code: [this.data.course?.code ?? '', [Validators.required]],
    name: [this.data.course?.name ?? '', [Validators.required]],
    level: [this.data.course?.level ?? '', [Validators.required]],
    letter: [this.data.course?.letter ?? '', [Validators.required]],
    schoolYear: [this.data.course?.schoolYear ?? 2026, [Validators.required, Validators.min(2020)]],
    scheduleType: [this.data.course?.scheduleType ?? '', [Validators.required]]
  });

  readonly availableStudents = signal<StudentCatalogItem[]>([]);
  readonly selectedStudents = signal<StudentCatalogItem[]>([]);
  readonly checkedAvailableIds = signal<number[]>([]);
  readonly checkedSelectedIds = signal<number[]>([]);
  readonly studentSearch = signal('');
  readonly isLoadingStudents = signal(false);

  readonly filteredAvailableStudents = computed(() => this.filterStudents(this.availableStudents()));
  readonly filteredSelectedStudents = computed(() => this.filterStudents(this.selectedStudents()));

  constructor() {
    if (this.data.course) {
      this.loadStudentAssignmentData(this.data.course.id);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: CoursePayload = {
      ...this.form.getRawValue(),
      studentIds: this.data.course ? this.selectedStudents().map((student) => student.id) : undefined
    };

    this.dialogRef.close(payload);
  }

  toggleAvailableStudent(studentId: number): void {
    this.checkedAvailableIds.update((ids) =>
      ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]
    );
  }

  toggleSelectedStudent(studentId: number): void {
    this.checkedSelectedIds.update((ids) =>
      ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]
    );
  }

  moveCheckedToSelected(): void {
    const ids = new Set(this.checkedAvailableIds());
    if (ids.size === 0) {
      return;
    }

    const toMove = this.availableStudents().filter((student) => ids.has(student.id));
    this.availableStudents.update((items) => items.filter((student) => !ids.has(student.id)));
    this.selectedStudents.update((items) => [...items, ...toMove].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')));
    this.checkedAvailableIds.set([]);
  }

  moveCheckedToAvailable(): void {
    const ids = new Set(this.checkedSelectedIds());
    if (ids.size === 0) {
      return;
    }

    const toMove = this.selectedStudents().filter((student) => ids.has(student.id));
    this.selectedStudents.update((items) => items.filter((student) => !ids.has(student.id)));
    this.availableStudents.update((items) => [...items, ...toMove].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')));
    this.checkedSelectedIds.set([]);
  }

  private loadStudentAssignmentData(courseId: number): void {
    this.isLoadingStudents.set(true);
    forkJoin({
      enrolled: this.enrollmentApiService.getOverview({ courseId }),
      available: this.courseApiService.searchAllUnassignedStudents('')
    }).subscribe({
      next: ({ enrolled, available }) => {
        const selected = enrolled.enrollments.map((item) => this.mapEnrollmentToCatalog(item));
        this.selectedStudents.set(selected.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es')));
        this.availableStudents.set(
          available
            .filter((student) => !selected.some((selectedStudent) => selectedStudent.id === student.id))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
        );
        this.isLoadingStudents.set(false);
      },
      error: () => {
        this.availableStudents.set([]);
        this.selectedStudents.set([]);
        this.isLoadingStudents.set(false);
      }
    });
  }

  private mapEnrollmentToCatalog(enrollment: EnrollmentListItem): StudentCatalogItem {
    return {
      id: enrollment.studentId,
      run: enrollment.studentRun,
      firstName: enrollment.studentName,
      lastName: enrollment.studentLastName,
      fullName: enrollment.fullName,
      address: '',
      birthDate: '',
      age: 0
    };
  }

  private filterStudents(items: StudentCatalogItem[]): StudentCatalogItem[] {
    const query = this.studentSearch().trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((student) =>
      student.fullName.toLowerCase().includes(query) || student.run.toLowerCase().includes(query)
    );
  }
}
