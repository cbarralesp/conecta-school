import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ScheduleBlock, ScheduleCatalog, ScheduleEntry, SchedulePayload } from '../../../core/models/schedule.models';

interface ScheduleDialogData {
  catalog: ScheduleCatalog;
  schedule?: ScheduleEntry;
  presetCourseId?: number | null;
  presetBlockId?: number | null;
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
        <span>{{ data.schedule ? 'Editar bloque horario' : 'Nuevo bloque horario' }}</span>
        <button mat-icon-button type="button" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <p class="dialog-copy">
          Asigna una asignatura, su docente y el bloque semanal en el que debe dictarse la clase.
        </p>

        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline">
            <mat-label>Curso</mat-label>
            <mat-select formControlName="courseId">
              @for (course of data.catalog.courses; track course.id) {
                <mat-option [value]="course.id">{{ course.name }} · {{ course.scheduleType }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Bloque</mat-label>
            <mat-select formControlName="blockId">
              @for (block of classBlocks(); track block.id) {
                <mat-option [value]="block.id">{{ blockLabel(block) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Asignatura</mat-label>
            <mat-select formControlName="subjectId">
              @for (subject of data.catalog.subjects; track subject.id) {
                <mat-option [value]="subject.id">{{ subject.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Profesor</mat-label>
            <mat-select formControlName="teacherId">
              @for (teacher of data.catalog.teachers; track teacher.id) {
                <mat-option [value]="teacher.id">{{ teacher.fullName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="span-2">
            <mat-label>Sala</mat-label>
            <input matInput formControlName="room" placeholder="Ej. SALA-12" />
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        @if (data.schedule) {
          <button mat-stroked-button color="warn" type="button" (click)="dialogRef.close({ delete: true })">
            Eliminar
          </button>
        }
        <button mat-stroked-button type="button" (click)="dialogRef.close()">Cancelar</button>
        <button mat-flat-button type="button" (click)="submit()">Guardar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      padding: 1.15rem 1.35rem 0.85rem;
    }
    .dialog-copy {
      margin: 0 0 1rem;
      color: #64748b;
      font-size: var(--app-font-size-body-sm);
      line-height: 1.6;
    }
    mat-dialog-content {
      padding: 0 1.35rem 1rem;
    }
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.85rem;
      min-width: min(40rem, 100%);
    }
    .span-2 {
      grid-column: span 2;
    }
    mat-dialog-actions {
      padding: 0.8rem 1.35rem 1.2rem;
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduleDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<ScheduleDialogComponent>);
  readonly data = inject<ScheduleDialogData>(MAT_DIALOG_DATA);

  readonly classBlocks = computed(() =>
    this.data.catalog.blocks.filter((block) => block.blockType === 'CLASE')
  );

  readonly form = this.formBuilder.group({
    courseId: [this.data.schedule?.courseId ?? this.data.presetCourseId ?? null, [Validators.required]],
    subjectId: [this.data.schedule?.subjectId ?? null, [Validators.required]],
    teacherId: [this.data.schedule?.teacherId ?? null, [Validators.required]],
    blockId: [this.data.schedule?.blockId ?? this.data.presetBlockId ?? null, [Validators.required]],
    room: [this.data.schedule?.room ?? '']
  });

  blockLabel(block: ScheduleBlock): string {
    return `${block.dayOfWeek} · ${block.startTime} - ${block.endTime}`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: SchedulePayload = {
      courseId: value.courseId!,
      subjectId: value.subjectId!,
      teacherId: value.teacherId!,
      blockId: value.blockId!,
      room: value.room?.trim() ? value.room.trim() : null
    };

    this.dialogRef.close({ payload });
  }
}
