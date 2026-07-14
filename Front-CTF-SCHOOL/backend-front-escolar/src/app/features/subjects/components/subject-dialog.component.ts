import { ChangeDetectionStrategy, Component, computed, signal, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { startWith } from 'rxjs';
import { Course, TeacherCatalogItem } from '../../../core/models/course.models';
import { Subject } from '../../../core/models/subject.models';
import { CourseApiService } from '../../../core/services/course-api.service';

interface SubjectDialogData {
  subject?: Subject;
}

@Component({
  selector: 'app-subject-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="dialog-shell">
      <h2 mat-dialog-title>
        <span>{{ data.subject ? 'Editar asignatura' : 'Nueva asignatura' }}</span>
        <button mat-icon-button type="button" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <p class="dialog-copy">Mantiene estandarizado el catálogo académico del sistema.</p>

        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline">
            <mat-label>Codigo</mat-label>
            <input matInput formControlName="code" />
            @if (getControlError('code')) {
              <mat-error>{{ getControlError('code') }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
            @if (getControlError('name')) {
              <mat-error>{{ getControlError('name') }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Area</mat-label>
            <input matInput formControlName="area" />
            @if (getControlError('area')) {
              <mat-error>{{ getControlError('area') }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Color</mat-label>
            <input matInput formControlName="colorHex" placeholder="#D7E8FB" />
            @if (getControlError('colorHex')) {
              <mat-error>{{ getControlError('colorHex') }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nivel de referencia</mat-label>
            <mat-select formControlName="referenceLevel">
              @for (level of levelOptions; track level.value) {
                <mat-option [value]="level.value">{{ level.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Horas sugeridas</mat-label>
            <input matInput type="number" formControlName="suggestedHours" />
            @if (getControlError('suggestedHours')) {
              <mat-error>{{ getControlError('suggestedHours') }}</mat-error>
            }
          </mat-form-field>

          <div class="span-2 color-picker-panel">
            <div class="color-picker-panel__copy">
              <span class="palette-label">Selector de color</span>
              <p>Elige cualquier tono con el selector. Puedes ir desde colores intensos hasta pasteles suaves.</p>
            </div>
            <div class="color-picker-panel__controls">
              <label class="color-picker-trigger" aria-label="Abrir selector de color">
                <input type="color" [value]="normalizedColor()" (input)="onColorPickerInput($event)" />
                <span class="color-picker-trigger__swatch" [style.background]="normalizedColor()"></span>
              </label>
              <div class="color-picker-panel__preview">
                <span class="color-picker-panel__hex">{{ normalizedColor() }}</span>
                <span class="color-picker-panel__sample" [style.background]="normalizedColor()"></span>
              </div>
            </div>
          </div>

          <section class="span-2 teacher-picker">
            <div class="teacher-picker__header">
              <div>
                <span class="teacher-picker__title">Cursos aplicables</span>
                <p>Opcional. Si no seleccionas cursos, la asignatura se mantendra disponible para todos los cursos activos.</p>
              </div>
              <span class="teacher-picker__count">{{ selectedCourseLabels().length }} seleccionados</span>
            </div>

            <mat-form-field appearance="outline" class="teacher-picker__field">
              <mat-label>Cursos activos</mat-label>
              <mat-select formControlName="applicableCourseIds" multiple>
                @for (course of activeCourseOptions(); track course.id) {
                  <mat-option [value]="course.id">
                    {{ course.name }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (selectedCourseLabels().length > 0) {
              <div class="teacher-picker__selected">
                @for (courseName of selectedCourseLabels(); track courseName) {
                  <span class="teacher-chip">
                    <span>{{ courseName }}</span>
                  </span>
                }
              </div>
            } @else {
              <div class="teacher-picker__empty">Sin cursos especificos. Se aplicara a todos los cursos activos disponibles.</div>
            }
          </section>

          <section class="span-2 teacher-picker">
            <div class="teacher-picker__header">
              <div>
                <span class="teacher-picker__title">Profesores asignados</span>
                <p>Selecciona uno o mas docentes para esta asignatura.</p>
              </div>
              <span class="teacher-picker__count">{{ selectedTeachers().length }} seleccionados</span>
            </div>

            <mat-form-field appearance="outline" class="teacher-picker__field">
              <mat-label>Profesores</mat-label>
              <mat-select formControlName="teacherIds" multiple>
                @for (teacher of teachers(); track teacher.id) {
                  <mat-option [value]="teacher.id">
                    {{ teacher.fullName }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (selectedTeachers().length > 0) {
              <div class="teacher-picker__selected">
                @for (teacher of selectedTeachers(); track teacher.id) {
                  <button type="button" class="teacher-chip" (click)="removeTeacher(teacher.id)">
                    <span>{{ teacher.fullName }}</span>
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>
            } @else {
              <div class="teacher-picker__empty">No hay profesores seleccionados.</div>
            }
          </section>

          <mat-form-field appearance="outline" class="span-2">
            <mat-label>Descripción</mat-label>
            <textarea matInput rows="2" formControlName="description"></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="dialogRef.close()">Cancelar</button>
        <button mat-flat-button type="button" (click)="submit()">Guardar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .subject-dialog-backdrop {
      background: rgba(15, 23, 42, 0.34);
      backdrop-filter: blur(6px);
    }
    .subject-dialog-panel .mat-mdc-dialog-surface {
      border-radius: 22px !important;
      background: transparent !important;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22) !important;
      overflow: hidden !important;
    }
    .dialog-shell {
      background:
        radial-gradient(circle at top right, rgba(15, 157, 107, 0.1), transparent 32%),
        radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 28%),
        linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border: 1px solid #e5ecf4;
      border-radius: 22px;
    }
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      padding: 1.05rem 1.15rem 0.9rem;
      background: linear-gradient(135deg, #ecfdf5 0%, #f8fbff 68%);
      border-bottom: 1px solid #e7eef6;
    }
    h2[mat-dialog-title] span {
      color: #18283f;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    h2[mat-dialog-title] button {
      color: #6b7f98;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 12px;
      box-shadow: inset 0 0 0 1px rgba(107, 127, 152, 0.14);
    }
    .dialog-copy {
      margin: 0 0 0.9rem;
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 500;
      line-height: 1.5;
    }
    mat-dialog-content {
      padding: 0 1.15rem 1rem;
      max-height: 70vh;
    }
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.8rem;
      min-width: min(38rem, 100%);
    }
    .dialog-form .mat-mdc-form-field {
      font-size: 0.8rem;
      --mat-form-field-container-height: 42px;
      --mat-form-field-container-vertical-padding: 9px;
      --mdc-outlined-text-field-outline-color: #dbe5f0;
      --mdc-outlined-text-field-hover-outline-color: #c9d8e9;
      --mdc-outlined-text-field-focus-outline-color: #0f9d6b;
      --mdc-filled-text-field-container-color: #f8fbff;
    }
    .dialog-form .mat-mdc-text-field-wrapper {
      min-height: 42px;
    }
    .span-2 {
      grid-column: span 2;
    }
    .color-picker-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.85rem;
      align-items: center;
      padding: 0.9rem 0.95rem;
      border: 1px solid #dbe5f0;
      border-radius: 16px;
      background: linear-gradient(180deg, #fcfdff 0%, #f6f9fd 100%);
    }
    .color-picker-panel__copy {
      display: grid;
      gap: 0.16rem;
    }
    .palette-label {
      color: #18283f;
      font-size: 0.78rem;
      font-weight: 800;
    }
    .color-picker-panel__copy p {
      margin: 0;
      color: #64748b;
      font-size: 0.74rem;
      line-height: 1.45;
      font-weight: 500;
    }
    .color-picker-panel__controls {
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
    }
    .color-picker-trigger {
      position: relative;
      display: inline-flex;
      width: 58px;
      height: 58px;
      border-radius: 18px;
      overflow: hidden;
      cursor: pointer;
      box-shadow: inset 0 0 0 1px rgba(23, 53, 83, 0.08), 0 12px 24px rgba(15, 23, 42, 0.08);
      background: #ffffff;
    }
    .color-picker-trigger input[type='color'] {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .color-picker-trigger__swatch {
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background: #d7e8fb;
    }
    .color-picker-panel__preview {
      display: grid;
      gap: 0.32rem;
      justify-items: start;
    }
    .color-picker-panel__hex {
      color: #28415f;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .color-picker-panel__sample {
      width: 92px;
      height: 18px;
      border-radius: 999px;
      box-shadow: inset 0 0 0 1px rgba(23, 53, 83, 0.08);
    }
    @media (max-width: 720px) {
      .color-picker-panel {
        grid-template-columns: 1fr;
      }
      .color-picker-panel__controls {
        justify-content: space-between;
      }
    }
    .teacher-picker {
      display: grid;
      gap: 0.7rem;
      padding: 0.9rem 0.95rem;
      border: 1px solid #dbe5f0;
      border-radius: 16px;
      background: linear-gradient(180deg, #fcfdff 0%, #f6f9fd 100%);
    }
    .teacher-picker__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.8rem;
      flex-wrap: wrap;
    }
    .teacher-picker__title {
      display: block;
      color: #18283f;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .teacher-picker__header p {
      margin: 0.18rem 0 0;
      color: #64748b;
      font-size: 0.76rem;
      line-height: 1.45;
      font-weight: 500;
    }
    .teacher-picker__count {
      color: #0f9d6b;
      font-size: 0.76rem;
      font-weight: 800;
    }
    .teacher-picker__search {
      height: 40px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 0.75rem;
      border: 1px solid #dbe5f0;
      border-radius: 12px;
      background: #ffffff;
    }
    .teacher-picker__search mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      color: #7e91ac;
    }
    .teacher-picker__search input {
      width: 100%;
      border: 0;
      outline: 0;
      background: transparent;
      color: #28415f;
      font-size: 0.8rem;
      font-weight: 600;
      font-family: inherit;
    }
    .teacher-picker__field {
      width: 100%;
    }
    .teacher-picker__selected {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .teacher-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.45rem 0.7rem;
      border: 0;
      border-radius: 999px;
      background: #e8f3ec;
      color: #126749;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
    }
    .teacher-chip mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .teacher-picker__empty {
      padding: 0.2rem 0;
      color: #71839d;
      font-size: 0.76rem;
      font-weight: 600;
    }
    mat-dialog-actions {
      position: sticky;
      bottom: 0;
      padding: 1rem 1.15rem 1.1rem;
      border-top: 1px solid rgba(226, 232, 240, 0.9);
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: blur(10px);
    }
    mat-dialog-actions button[mat-flat-button] {
      min-height: 42px;
      border-radius: 14px;
      padding-inline: 1.15rem;
      background: #0f9d6b;
      color: #ffffff;
      box-shadow: 0 14px 24px rgba(15, 157, 107, 0.16);
    }
    mat-dialog-actions button[mat-stroked-button] {
      min-height: 42px;
      border-radius: 14px;
      border-color: #d8e3ef;
      color: #51667f;
    }
    @media (max-width: 720px) {
      .dialog-form {
        grid-template-columns: 1fr;
        min-width: auto;
      }
      .span-2 {
        grid-column: auto;
      }
      mat-dialog-actions {
        justify-content: stretch;
      }
      mat-dialog-actions button {
        flex: 1 1 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class SubjectDialogComponent {
  private readonly referenceLevelOptions = [
    { value: 'Inicial', label: 'Inicial' },
    { value: 'Básico', label: 'Básico' },
    { value: 'Media', label: 'Media' }
  ] as const;
  private readonly formBuilder = inject(FormBuilder);
  private readonly courseApiService = inject(CourseApiService);
  readonly dialogRef = inject(MatDialogRef<SubjectDialogComponent>);
  readonly data = inject<SubjectDialogData | null>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  readonly teachers = signal<TeacherCatalogItem[]>([]);
  readonly activeCourseOptions = signal<Course[]>([]);
  readonly levelOptions = this.referenceLevelOptions;
  readonly selectedTeacherIds = signal<number[]>(this.data.subject?.assignedTeachers.map((teacher) => teacher.id) ?? []);
  readonly form = this.formBuilder.nonNullable.group({
    code: [this.data.subject?.code ?? '', [Validators.required, Validators.maxLength(30)]],
    name: [this.data.subject?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    area: [this.data.subject?.area ?? '', [Validators.required, Validators.maxLength(120)]],
    colorHex: [
      this.data.subject?.colorHex ?? '#D7E8FB',
      [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]
    ],
    description: [this.data.subject?.description ?? '', [Validators.maxLength(500)]],
    referenceLevel: [this.data.subject?.referenceLevel ?? 'Básico', [Validators.maxLength(80)]],
    evaluationType: ['NUMERICA', [Validators.required]],
    suggestedHours: [this.data.subject?.suggestedHours ?? 2, [Validators.required, Validators.min(1), Validators.max(20)]],
    teacherIds: [this.data.subject?.assignedTeachers.map((teacher) => teacher.id) ?? []],
    applicableGradeIds: [this.data.subject?.applicableGradeIds ?? []],
    applicableCourseIds: [this.data.subject?.applicableCourseIds ?? []]
  });
  readonly selectedTeachers = computed(() => {
    const selectedIds = new Set(this.selectedTeacherIds());
    return this.teachers().filter((teacher) => selectedIds.has(teacher.id));
  });
  readonly selectedCourseLabels = computed(() => {
    const selectedIds = new Set(this.form.controls.applicableCourseIds.value);
    return this.activeCourseOptions()
      .filter((course) => selectedIds.has(course.id))
      .map((course) => course.name);
  });

  constructor() {
    this.courseApiService.searchTeachers('').subscribe({
      next: (teachers) => this.teachers.set(teachers),
      error: () => this.teachers.set([])
    });
    this.courseApiService.findAll().subscribe({
      next: (courses) => this.activeCourseOptions.set(courses.filter((course) => course.active)),
      error: () => this.activeCourseOptions.set([])
    });
    this.form.controls.teacherIds.valueChanges
      .pipe(startWith(this.form.controls.teacherIds.value))
      .subscribe((teacherIds) => this.selectedTeacherIds.set(teacherIds));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      ...this.form.getRawValue(),
      evaluationType: 'NUMERICA'
    });
  }

  normalizedColor(): string {
    const value = this.form.controls.colorHex.value.trim();
    return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : '#D7E8FB';
  }

  onColorPickerInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.selectColor(value);
  }

  selectColor(colorHex: string): void {
    this.form.controls.colorHex.setValue(colorHex);
    this.form.controls.colorHex.markAsDirty();
    this.form.controls.colorHex.markAsTouched();
  }
  removeTeacher(teacherId: number): void {
    this.form.controls.teacherIds.setValue(
      this.form.controls.teacherIds.value.filter((id) => id !== teacherId)
    );
    this.form.controls.teacherIds.markAsDirty();
  }

  getControlError(
    controlName: 'code' | 'name' | 'area' | 'colorHex' | 'suggestedHours'
  ): string {
    const control = this.form.controls[controlName];
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('maxlength')) {
      return 'Supera el largo permitido.';
    }
    if (control.hasError('pattern')) {
      return 'Usa formato #RRGGBB.';
    }
    if (control.hasError('min')) {
      return 'Ingresa al menos 1 hora.';
    }
    if (control.hasError('max')) {
      return 'No puede superar 20 horas.';
    }
    return 'Revisa este campo.';
  }
}
