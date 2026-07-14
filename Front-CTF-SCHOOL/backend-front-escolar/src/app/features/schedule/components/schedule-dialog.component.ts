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
    <div
      class="dialog-shell"
      [class.dialog-shell--row]="!isEntryMode()"
      [class.dialog-shell--break]="!isEntryMode() && currentRowBlockType() === 'RECREO'">
      <h2 mat-dialog-title>
        <div class="dialog-title-wrap">
          <div class="dialog-title-icon">
            <mat-icon>{{ dialogIcon() }}</mat-icon>
          </div>
          <div class="dialog-title">
            <span class="dialog-eyebrow">{{ eyebrow() }}</span>
            <span>{{ dialogTitle() }}</span>
          </div>
        </div>

        <button mat-icon-button type="button" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <section class="dialog-context-card">
          <div class="dialog-context-card__icon">
            <mat-icon>{{ dialogIcon() }}</mat-icon>
          </div>
          <div class="dialog-context-card__copy">
            <strong>{{ dialogContextTitle() }}</strong>
            <span>{{ dialogCopy() }}</span>
          </div>
          <span class="dialog-context-card__badge">{{ dialogContextBadge() }}</span>
        </section>

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
      background: rgba(15, 23, 42, 0.42);
      backdrop-filter: blur(8px);
    }
    .cdk-overlay-pane.schedule-dialog-panel {
      max-width: calc(100vw - 1.5rem) !important;
    }
    .schedule-dialog-panel .mat-mdc-dialog-surface {
      border-radius: 28px !important;
      background: transparent !important;
      box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28) !important;
      overflow: hidden !important;
    }
    .schedule-dialog-panel .mat-mdc-dialog-content {
      max-height: none !important;
    }
    .dialog-shell {
      --schedule-dialog-accent: #0f9d6b;
      --schedule-dialog-accent-strong: #0f8c61;
      --schedule-dialog-accent-soft: #dcfce7;
      --schedule-dialog-accent-border: #bbf7d0;
      --schedule-dialog-accent-shadow: rgba(15, 157, 107, 0.18);
      background:
        linear-gradient(140deg, color-mix(in srgb, var(--schedule-dialog-accent-soft) 92%, #ffffff) 0%, #ffffff 42%),
        linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border-radius: 28px;
      border: 1px solid color-mix(in srgb, var(--schedule-dialog-accent-border) 55%, #e5ecf4);
      color: #102849;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      max-height: min(92dvh, 760px);
      overflow: hidden;
      font-family: inherit;
    }
    .dialog-shell--break {
      --schedule-dialog-accent: #d97706;
      --schedule-dialog-accent-strong: #b45309;
      --schedule-dialog-accent-soft: #fef3c7;
      --schedule-dialog-accent-border: #fed7aa;
      --schedule-dialog-accent-shadow: rgba(217, 119, 6, 0.18);
    }
    .dialog-shell h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      min-height: 112px;
      padding: 1.1rem 1.4rem 1.05rem;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--schedule-dialog-accent-soft) 86%, #ffffff) 0%, #ffffff 76%);
      border-bottom: 1px solid #e5edf7;
    }
    .dialog-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
    }
    .dialog-title-icon {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      background: var(--schedule-dialog-accent-soft);
      color: var(--schedule-dialog-accent);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.64);
    }
    .dialog-title-icon .mat-icon {
      width: 28px;
      height: 28px;
      font-size: 28px;
    }
    .dialog-title {
      display: grid;
      gap: 0.22rem;
      min-width: 0;
    }
    .dialog-eyebrow {
      color: var(--schedule-dialog-accent-strong);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .dialog-shell h2[mat-dialog-title] .dialog-title > span:last-child {
      color: #18283f;
      font-size: 1.2rem;
      line-height: 1.16;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .dialog-shell h2[mat-dialog-title] button {
      color: #6b7f98;
      background: #f1f5f9 !important;
      border-radius: 18px;
      width: 54px;
      height: 54px;
      min-width: 54px;
      box-shadow: inset 0 0 0 1px #d9e4f1;
    }
    .dialog-shell mat-dialog-content {
      padding: 1.25rem 1.4rem 1.15rem !important;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: rgba(255, 255, 255, 0.9);
    }
    .dialog-context-card {
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.95rem;
      margin-bottom: 1.05rem;
      padding: 0.95rem 1rem;
      border-radius: 20px;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--schedule-dialog-accent-soft) 68%, #ffffff) 0%, #ffffff 100%);
      border: 1.5px solid color-mix(in srgb, var(--schedule-dialog-accent-border) 82%, #ffffff);
      box-shadow: 0 12px 28px var(--schedule-dialog-accent-shadow);
    }
    .dialog-context-card__icon {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      background: var(--schedule-dialog-accent-soft);
      color: var(--schedule-dialog-accent);
    }
    .dialog-context-card__icon .mat-icon {
      width: 26px;
      height: 26px;
      font-size: 26px;
    }
    .dialog-context-card__copy {
      display: grid;
      gap: 0.14rem;
      min-width: 0;
    }
    .dialog-context-card__copy strong {
      color: #152a49;
      font-size: 0.94rem;
      font-weight: 900;
      line-height: 1.22;
    }
    .dialog-context-card__copy span {
      color: #647795;
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.45;
    }
    .dialog-context-card__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 0 0.9rem;
      border-radius: 999px;
      background: #e9eff7;
      color: #405472;
      font-size: 0.74rem;
      font-weight: 850;
      white-space: nowrap;
    }
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.95rem;
      min-width: min(40rem, 100%);
    }
    .dialog-form--row {
      min-width: min(30rem, 100%);
    }
    .dialog-form mat-form-field {
      --mdc-outlined-text-field-container-shape: 16px;
      --mdc-outlined-text-field-outline-color: #dbe5f0;
      --mdc-outlined-text-field-hover-outline-color: #c9d8e9;
      --mdc-outlined-text-field-focus-outline-color: var(--schedule-dialog-accent);
      --mdc-filled-text-field-container-color: #f8fbff;
      --mat-form-field-container-height: 58px;
      --mat-form-field-container-vertical-padding: 16px;
      width: 100%;
    }
    .dialog-form .mat-mdc-text-field-wrapper {
      background: #fbfdff;
      border-radius: 16px;
    }
    .dialog-form .mat-mdc-form-field-flex {
      min-height: 58px;
    }
    .dialog-form .mat-mdc-form-field-infix {
      min-height: 58px;
    }
    .dialog-form .mat-mdc-floating-label {
      color: #5e6f89;
      font-weight: 800;
    }
    .dialog-form .mat-mdc-select-value,
    .dialog-form .mat-mdc-input-element {
      color: #17233c;
      font-size: 1rem;
      font-weight: 750;
      letter-spacing: 0;
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
      background: color-mix(in srgb, var(--schedule-dialog-accent-soft) 42%, #ffffff);
      border: 1px solid color-mix(in srgb, var(--schedule-dialog-accent-border) 78%, #ffffff);
    }
    .dialog-note mat-icon {
      color: var(--schedule-dialog-accent);
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
    .dialog-shell mat-dialog-actions {
      gap: 0.75rem;
      padding: 1rem 1.4rem 1.15rem !important;
      border-top: 1px solid rgba(226, 232, 240, 0.9);
      background: rgba(255, 255, 255, 0.94);
    }
    .dialog-shell mat-dialog-actions button[mat-flat-button] {
      min-height: 50px;
      min-width: 174px;
      border-radius: 18px;
      padding-inline: 1.35rem;
      background: var(--schedule-dialog-accent) !important;
      color: #ffffff !important;
      font-weight: 900;
      box-shadow: 0 12px 26px var(--schedule-dialog-accent-shadow);
    }
    .dialog-shell mat-dialog-actions button[mat-stroked-button] {
      min-height: 50px;
      min-width: 154px;
      border-radius: 18px;
      border-color: #d8e3ef;
      color: #51667f !important;
      font-weight: 850;
      background: #ffffff !important;
    }
    .dialog-shell mat-dialog-actions button[color='warn'] {
      border-color: rgba(239, 68, 68, 0.22);
      color: #ef4444;
    }
    @media (max-width: 720px) {
      .cdk-overlay-pane.schedule-dialog-panel {
        max-width: calc(100vw - 1rem) !important;
      }
      .dialog-shell {
        max-height: calc(100dvh - 1rem);
        border-radius: 26px;
      }
      .dialog-shell h2[mat-dialog-title] {
        min-height: 96px;
        padding: 0.95rem 1rem;
      }
      .dialog-title-icon {
        width: 48px;
        height: 48px;
        border-radius: 16px;
      }
      .dialog-title-icon .mat-icon {
        width: 24px;
        height: 24px;
        font-size: 24px;
      }
      .dialog-shell h2[mat-dialog-title] .dialog-title > span:last-child {
        font-size: 1.03rem;
      }
      .dialog-shell h2[mat-dialog-title] button {
        width: 48px;
        height: 48px;
        min-width: 48px;
      }
      .dialog-shell mat-dialog-content {
        padding: 1rem 1rem 0.95rem !important;
      }
      .dialog-context-card {
        grid-template-columns: 46px minmax(0, 1fr);
        gap: 0.78rem;
        padding: 0.85rem;
      }
      .dialog-context-card__icon {
        width: 46px;
        height: 46px;
        border-radius: 15px;
      }
      .dialog-context-card__badge {
        grid-column: 1 / -1;
        justify-self: start;
        min-height: 32px;
      }
      .dialog-form {
        grid-template-columns: 1fr;
        min-width: auto;
        gap: 0.82rem;
      }
      .span-2 {
        grid-column: auto;
      }
      .dialog-shell mat-dialog-actions {
        display: grid !important;
        grid-template-columns: 1fr;
        padding: 0.85rem 1rem 1rem !important;
      }
      .dialog-shell mat-dialog-actions button[mat-flat-button],
      .dialog-shell mat-dialog-actions button[mat-stroked-button] {
        width: 100%;
        min-width: 0;
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

  dialogIcon(): string {
    if (this.mode === 'entry-create' || this.mode === 'entry-edit') {
      return 'calendar_view_week';
    }
    return this.currentRowBlockType() === 'RECREO' ? 'coffee' : 'view_week';
  }

  dialogContextTitle(): string {
    if (this.isEntryMode()) {
      return this.mode === 'entry-edit' ? 'Bloque asignado' : 'Nueva clase en horario';
    }
    return this.currentRowBlockType() === 'RECREO' ? 'Recreo institucional' : 'Bloque de clase';
  }

  dialogContextBadge(): string {
    if (this.isEntryMode()) {
      return this.mode === 'entry-edit' ? 'Edicion' : 'Nuevo';
    }
    return this.currentRowBlockType() === 'RECREO' ? 'Recreo' : 'Disponible';
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
