import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  ActivityType,
  SchoolActivity,
  CreateSchoolActivityRequest
} from '../../../core/models/activity-calendar.models';

interface ActivityDialogData {
  activityTypes: ActivityType[];
  selectedDate?: string;
  activity?: SchoolActivity;
  courseId?: number | null;
}

type ActivityDialogResult =
  | { action: 'save'; payload: CreateSchoolActivityRequest }
  | { action: 'delete' };

@Component({
  selector: 'app-activity-dialog',
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
        <span>{{ data.activity ? 'Editar actividad' : 'Nueva actividad' }}</span>
        <button mat-icon-button type="button" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <div class="dialog-copy">
          <p>
            {{ data.activity ? 'Actualiza la informacion de la actividad seleccionada.' : 'Crea una actividad escolar y publicala directamente en el calendario mensual.' }}
          </p>
        </div>

        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline">
            <mat-label>Tipo de actividad</mat-label>
            <mat-select formControlName="activityTypeId">
              @for (type of data.activityTypes; track type.id) {
                <mat-option [value]="type.id">{{ type.name }}</mat-option>
              }
            </mat-select>
            @if (getControlError('activityTypeId')) {
              <mat-error>{{ getControlError('activityTypeId') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Titulo</mat-label>
            <input matInput formControlName="title" />
            @if (getControlError('title')) {
              <mat-error>{{ getControlError('title') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Descripcion</mat-label>
            <textarea matInput rows="3" formControlName="description"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput type="date" formControlName="date" />
            @if (getControlError('date')) {
              <mat-error>{{ getControlError('date') }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fecha termino</mat-label>
            <input matInput type="date" formControlName="endDate" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora</mat-label>
            <input matInput type="time" formControlName="time" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ubicacion</mat-label>
            <input matInput formControlName="location" />
          </mat-form-field>
        </form>

        @if (selectedType(); as type) {
          <section class="type-preview" [style.background]="type.backgroundColor" [style.color]="type.textColor">
            <strong>{{ type.name }}</strong>
            <span>{{ type.description }}</span>
          </section>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        @if (data.activity) {
          <button mat-button type="button" class="delete-button" (click)="requestDelete()">
            Eliminar actividad
          </button>
        }
        <button mat-stroked-button type="button" (click)="dialogRef.close()">Cancelar</button>
        <button mat-flat-button type="button" (click)="submit()">
          {{ data.activity ? 'Guardar cambios' : 'Crear actividad' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .activity-dialog-backdrop {
      background: rgba(15, 23, 42, 0.34);
      backdrop-filter: blur(6px);
    }
    .activity-dialog-panel .mat-mdc-dialog-surface {
      border-radius: 22px !important;
      background: transparent !important;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22) !important;
      overflow: hidden !important;
    }
    .dialog-shell {
      display: grid;
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
      padding: 1.1rem 1.2rem 1rem;
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
      margin-bottom: 1rem;
    }
    .dialog-copy p {
      margin: 0;
      color: #62718a;
      font-size: 0.82rem;
      font-weight: 500;
      line-height: 1.6;
    }
    mat-dialog-content {
      padding: 0 1.2rem 1rem;
      overflow: auto;
    }
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.9rem;
      min-width: min(48rem, 100%);
    }
    .dialog-form mat-form-field,
    .full-width {
      width: 100%;
    }
    .dialog-form mat-form-field {
      --mdc-outlined-text-field-outline-color: #dbe5f0;
      --mdc-outlined-text-field-hover-outline-color: #c9d8e9;
      --mdc-outlined-text-field-focus-outline-color: #0f9d6b;
      --mdc-filled-text-field-container-color: #f8fbff;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .type-preview {
      margin-top: 0.5rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      display: grid;
      gap: 0.25rem;
    }
    mat-dialog-actions {
      position: sticky;
      bottom: 0;
      display: flex;
      gap: 0.75rem;
      margin: 0;
      padding: 1rem 1.2rem 1.15rem;
      border-top: 1px solid rgba(226, 232, 240, 0.9);
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: blur(10px);
    }
    .delete-button {
      margin-right: auto;
      color: #b3261e;
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
      h2[mat-dialog-title] {
        padding-inline: 1rem;
      }
      mat-dialog-content,
      mat-dialog-actions {
        padding-inline: 1rem;
      }
      mat-dialog-actions button:not(.delete-button) {
        flex: 1 1 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ActivityDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<ActivityDialogComponent, ActivityDialogResult>);
  readonly data = inject<ActivityDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.nonNullable.group({
    activityTypeId: [this.data.activity?.activityTypeId ?? this.data.activityTypes[0]?.id ?? 0, [Validators.required, Validators.min(1)]],
    title: [this.data.activity?.title ?? '', [Validators.required]],
    description: [this.data.activity?.description ?? ''],
    date: [this.data.activity?.date ?? this.data.selectedDate ?? '', [Validators.required]],
    endDate: [this.data.activity?.endDate ?? ''],
    time: [this.data.activity?.time ?? ''],
    location: [this.data.activity?.location ?? '']
  });

  readonly selectedType = computed(
    () => this.data.activityTypes.find((type) => type.id === this.form.controls.activityTypeId.value) ?? null
  );

  getControlError(controlName: 'activityTypeId' | 'title' | 'date'): string {
    const control = this.form.controls[controlName];
    if (!control.invalid || (!control.touched && !control.dirty)) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('min')) {
      return 'Selecciona una opcion valida.';
    }
    return 'Revisa este campo.';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

        const rawValue = this.form.getRawValue();
    this.dialogRef.close({
      action: 'save',
      payload: {
        activityTypeId: rawValue.activityTypeId,
        courseId: this.data.courseId ?? this.data.activity?.courseId ?? null,
        title: rawValue.title,
        description: rawValue.description.trim() || '',
        date: rawValue.date,
        endDate: rawValue.endDate || null,
        time: rawValue.time || null,
        location: rawValue.location.trim() || null
      } satisfies CreateSchoolActivityRequest
    });
  }

  requestDelete(): void {
    this.dialogRef.close({ action: 'delete' });
  }
}
