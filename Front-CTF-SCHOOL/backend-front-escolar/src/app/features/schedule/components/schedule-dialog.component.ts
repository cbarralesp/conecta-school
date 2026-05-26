import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ScheduleBlock, ScheduleBlockType, ScheduleCatalog, ScheduleEntry, SchedulePayload } from '../../../core/models/schedule.models';

export type ScheduleDialogMode = 'entry-create' | 'entry-edit' | 'row-create' | 'row-edit';

export interface ScheduleRowDraft {
  rowKey: string;
  order: number;
  startTime: string;
  endTime: string;
  blockType: 'CLASE' | 'RECREO';
  isCustom: boolean;
  sourceOrder: number | null;
}

export interface ScheduleDialogData {
  catalog: ScheduleCatalog;
  mode?: ScheduleDialogMode;
  schedule?: ScheduleEntry;
  row?: ScheduleRowDraft;
  presetPeriodId?: number | null;
  presetCourseId?: number | null;
  presetBlockId?: number | null;
}

export interface ScheduleDialogCloseResult {
  entryPayload?: SchedulePayload;
  deleteEntry?: boolean;
  rowPayload?: ScheduleRowDraft;
  deleteRow?: boolean;
}

@Component({
  selector: 'app-schedule-dialog',
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
        <div class="dialog-title">
          <span class="dialog-eyebrow">{{ eyebrow() }}</span>
          <span>{{ dialogTitle() }}</span>
        </div>

        <button mat-icon-button type="button" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <p class="dialog-copy">{{ dialogCopy() }}</p>

        @if (isEntryMode()) {
          <form [formGroup]="entryForm" class="dialog-form">
            <mat-form-field appearance="outline">
              <mat-label>Curso</mat-label>
              <mat-select formControlName="courseId">
                @for (course of data.catalog.courses; track course.id) {
                  <mat-option [value]="course.id">{{ course.name }} - {{ course.scheduleType }}</mat-option>
                }
              </mat-select>
              @if (getEntryControlError('courseId')) {
                <mat-error>{{ getEntryControlError('courseId') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Bloque</mat-label>
              <mat-select formControlName="blockId">
                @for (block of classBlocks(); track block.id) {
                  <mat-option [value]="block.id">{{ blockLabel(block) }}</mat-option>
                }
              </mat-select>
              @if (getEntryControlError('blockId')) {
                <mat-error>{{ getEntryControlError('blockId') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Asignatura</mat-label>
              <mat-select formControlName="subjectId">
                @for (subject of data.catalog.subjects; track subject.id) {
                  <mat-option [value]="subject.id">{{ subject.name }}</mat-option>
                }
              </mat-select>
              @if (getEntryControlError('subjectId')) {
                <mat-error>{{ getEntryControlError('subjectId') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Profesor</mat-label>
              <mat-select formControlName="teacherId">
                @for (teacher of data.catalog.teachers; track teacher.id) {
                  <mat-option [value]="teacher.id">{{ teacher.fullName }}</mat-option>
                }
              </mat-select>
              @if (getEntryControlError('teacherId')) {
                <mat-error>{{ getEntryControlError('teacherId') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="span-2">
              <mat-label>Sala</mat-label>
              <input matInput formControlName="room" placeholder="Ej. Sala 4 o Laboratorio" />
            </mat-form-field>
          </form>
        } @else {
          <form [formGroup]="rowForm" class="dialog-form dialog-form--row">
            <mat-form-field appearance="outline">
              <mat-label>Tipo de bloque</mat-label>
              <mat-select formControlName="blockType">
                <mat-option value="CLASE">Bloque de clase</mat-option>
                <mat-option value="RECREO">Recreo</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hora inicio</mat-label>
              <input matInput type="time" formControlName="startTime" />
              @if (getRowControlError('startTime')) {
                <mat-error>{{ getRowControlError('startTime') }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hora termino</mat-label>
              <input matInput type="time" formControlName="endTime" />
              @if (getRowControlError('endTime')) {
                <mat-error>{{ getRowControlError('endTime') }}</mat-error>
              }
            </mat-form-field>

            <div class="dialog-note span-2">
              @if (currentRowBlockType() === 'RECREO') {
                <mat-icon>coffee</mat-icon>
                <div>
                  <strong>Recreo del horario</strong>
                  <span>Este bloque se mostrara en el horario y en el PDF exportado de la malla institucional.</span>
                </div>
              } @else {
                <mat-icon>schedule</mat-icon>
                <div>
                  <strong>Ajuste visual del bloque</strong>
                  <span>La hora editada se aplica al tablero y a la exportacion del horario institucional.</span>
                </div>
              }
            </div>
          </form>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        @if (isEditEntryMode()) {
          <button mat-stroked-button color="warn" type="button" (click)="dialogRef.close({ deleteEntry: true })">
            Eliminar horario
          </button>
        }

        @if (isRowEditMode()) {
          <button
            mat-stroked-button
            color="warn"
            type="button"
            (click)="dialogRef.close({ deleteRow: true, rowPayload: data.row })">
            {{ isBreakRow() ? 'Eliminar recreo' : 'Eliminar bloque' }}
          </button>
        }

        <button mat-stroked-button type="button" (click)="dialogRef.close()">Cancelar</button>
        <button mat-flat-button type="button" (click)="submit()">
          {{ submitLabel() }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .schedule-dialog-backdrop {
      background: rgba(15, 23, 42, 0.34);
      backdrop-filter: blur(6px);
    }
    .schedule-dialog-panel .mat-mdc-dialog-surface {
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
      border-radius: 22px;
      border: 1px solid #e5ecf4;
    }
    h2[mat-dialog-title] {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      padding: 1.1rem 1.2rem 1rem;
      background: linear-gradient(135deg, #ecfdf5 0%, #f8fbff 68%);
      border-bottom: 1px solid #e7eef6;
    }
    .dialog-title {
      display: grid;
      gap: 0.15rem;
    }
    .dialog-eyebrow {
      color: #0f9d6b;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h2[mat-dialog-title] .dialog-title > span:last-child {
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
      margin: 0 0 1rem;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 500;
      line-height: 1.6;
    }
    mat-dialog-content {
      padding: 0 1.2rem 1rem;
    }
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
      min-width: min(40rem, 100%);
    }
    .dialog-form--row {
      min-width: min(30rem, 100%);
    }
    .dialog-form mat-form-field {
      --mdc-outlined-text-field-container-shape: 14px;
      --mdc-outlined-text-field-outline-color: #dbe5f0;
      --mdc-outlined-text-field-hover-outline-color: #c9d8e9;
      --mdc-outlined-text-field-focus-outline-color: #0f9d6b;
      --mdc-filled-text-field-container-color: #f8fbff;
    }
    .span-2 {
      grid-column: span 2;
    }
    .dialog-note {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.95rem 1rem;
      border-radius: 16px;
      background: #f8fbff;
      border: 1px solid #e4edf7;
    }
    .dialog-note mat-icon {
      color: #0f9d6b;
    }
    .dialog-note strong {
      display: block;
      color: #1e3655;
      font-size: 0.82rem;
      font-weight: 800;
    }
    .dialog-note span {
      display: block;
      margin-top: 0.15rem;
      color: #64748b;
      font-size: 0.76rem;
      line-height: 1.5;
    }
    mat-dialog-actions {
      padding: 1rem 1.2rem 1.15rem;
      border-top: 1px solid rgba(226, 232, 240, 0.9);
      background: rgba(255, 255, 255, 0.8);
    }
    mat-dialog-actions button[mat-flat-button] {
      min-height: 42px;
      border-radius: 14px;
      padding-inline: 1.15rem;
      background: #0f9d6b;
      color: #ffffff;
      box-shadow: none;
    }
    mat-dialog-actions button[mat-stroked-button] {
      min-height: 42px;
      border-radius: 14px;
      border-color: #d8e3ef;
      color: #51667f;
    }
    mat-dialog-actions button[color='warn'] {
      border-color: rgba(239, 68, 68, 0.22);
      color: #ef4444;
    }
    @media (max-width: 720px) {
      .dialog-form {
        grid-template-columns: 1fr;
        min-width: auto;
      }
      .span-2 {
        grid-column: auto;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ScheduleDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<ScheduleDialogComponent, ScheduleDialogCloseResult>);
  readonly data = inject<ScheduleDialogData>(MAT_DIALOG_DATA);

  readonly mode = this.data.mode ?? (this.data.schedule ? 'entry-edit' : 'entry-create');
  readonly isEntryMode = computed(() => this.mode === 'entry-create' || this.mode === 'entry-edit');
  readonly isEditEntryMode = computed(() => this.mode === 'entry-edit');
  readonly isRowEditMode = computed(() => this.mode === 'row-edit');
  readonly isBreakRow = computed(() => this.mode === 'row-edit' && this.data.row?.blockType === 'RECREO');

  readonly classBlocks = computed(() =>
    this.data.catalog.blocks.filter((block) => block.blockType === 'CLASE')
  );

  readonly entryForm = this.formBuilder.group({
    periodId: [this.data.schedule?.periodId ?? this.data.presetPeriodId ?? null, [Validators.required]],
    courseId: [this.data.schedule?.courseId ?? this.data.presetCourseId ?? null, [Validators.required]],
    subjectId: [this.data.schedule?.subjectId ?? null, [Validators.required]],
    teacherId: [this.data.schedule?.teacherId ?? null, [Validators.required]],
    blockId: [this.data.schedule?.blockId ?? this.data.presetBlockId ?? null, [Validators.required]],
    room: [this.data.schedule?.room ?? '']
  });

  readonly rowForm = this.formBuilder.group({
    blockType: [this.data.row?.blockType ?? 'CLASE', [Validators.required]],
    startTime: [this.data.row?.startTime ?? '', [Validators.required]],
    endTime: [this.data.row?.endTime ?? '', [Validators.required]]
  });

  eyebrow(): string {
    if (this.mode === 'entry-edit') {
      return 'Horario';
    }
    if (this.mode === 'row-create') {
      return this.currentRowBlockType() === 'RECREO' ? 'Recreo' : 'Bloque';
    }
    if (this.mode === 'row-edit') {
      return this.data.row?.blockType === 'RECREO' ? 'Recreo' : 'Hora';
    }
    return 'Horario';
  }

  dialogTitle(): string {
    if (this.mode === 'entry-edit') {
      return 'Editar bloque horario';
    }
    if (this.mode === 'row-create') {
      return this.currentRowBlockType() === 'RECREO' ? 'Agregar recreo' : 'Agregar bloque horario';
    }
    if (this.mode === 'row-edit') {
      return this.data.row?.blockType === 'RECREO' ? 'Editar recreo' : 'Editar hora del bloque';
    }
    return 'Nuevo bloque horario';
  }

  dialogCopy(): string {
    if (this.mode === 'entry-edit' || this.mode === 'entry-create') {
      return 'Asigna una asignatura, su docente y el bloque semanal en el que debe dictarse la clase.';
    }
    if (this.currentRowBlockType() === 'RECREO') {
      return 'Configura la hora del recreo adicional que quieres mostrar en el horario semanal.';
    }
    return this.mode === 'row-create'
      ? 'Crea un nuevo bloque de clase para dejar disponible otra fila en la grilla semanal.'
      : 'Ajusta el tramo horario que se muestra en esta fila del horario para este curso.';
  }

  submitLabel(): string {
    if (this.mode === 'entry-create') {
      return 'Agregar horario';
    }
    if (this.mode === 'entry-edit') {
      return 'Guardar cambios';
    }
    if (this.mode === 'row-create') {
      return this.currentRowBlockType() === 'RECREO' ? 'Agregar recreo' : 'Agregar bloque';
    }
    return 'Guardar hora';
  }

  currentRowBlockType(): ScheduleBlockType {
    return (this.rowForm.controls.blockType.value ?? this.data.row?.blockType ?? 'CLASE') as ScheduleBlockType;
  }

  blockLabel(block: ScheduleBlock): string {
    return `${block.dayOfWeek} - ${block.startTime} - ${block.endTime}`;
  }

  getEntryControlError(controlName: 'courseId' | 'blockId' | 'subjectId' | 'teacherId'): string {
    const control = this.entryForm.controls[controlName];
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    return 'Revisa este campo.';
  }

  getRowControlError(controlName: 'startTime' | 'endTime' | 'blockType'): string {
    const control = this.rowForm.controls[controlName];
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    return 'Revisa este campo.';
  }

  submit(): void {
    if (this.isEntryMode()) {
      if (this.entryForm.invalid) {
        this.entryForm.markAllAsTouched();
        return;
      }

      const value = this.entryForm.getRawValue();
      const payload: SchedulePayload = {
        periodId: value.periodId!,
        courseId: value.courseId!,
        subjectId: value.subjectId!,
        teacherId: value.teacherId!,
        blockId: value.blockId!,
        room: value.room?.trim() ? value.room.trim() : null
      };

      this.dialogRef.close({ entryPayload: payload });
      return;
    }

    if (this.rowForm.invalid || !this.data.row) {
      this.rowForm.markAllAsTouched();
      return;
    }

    const value = this.rowForm.getRawValue();
    const rowPayload: ScheduleRowDraft = {
      ...this.data.row,
      blockType: (value.blockType ?? this.data.row.blockType) as ScheduleBlockType,
      startTime: value.startTime!,
      endTime: value.endTime!
    };

    this.dialogRef.close({ rowPayload });
  }
}
