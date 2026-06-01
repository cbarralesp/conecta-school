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
        <div class="dialog-title-icon">
          <mat-icon>calendar_month</mat-icon>
        </div>
        <div class="dialog-title-block">
          <span>{{ data.activity ? 'Editar actividad' : 'Nueva actividad' }}</span>
          <small>
            {{ data.activity ? 'Ajusta los datos del evento seleccionado.' : 'Completa el detalle y publicala en el calendario del curso.' }}
          </small>
        </div>
        <button mat-icon-button type="button" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <div class="dialog-copy">
          <div class="dialog-chip">
            <mat-icon>event</mat-icon>
            <span>{{ form.controls.date.value || data.selectedDate || 'Sin fecha seleccionada' }}</span>
          </div>
          @if (selectedType(); as type) {
            <div class="dialog-chip dialog-chip--soft" [style.--chip-accent]="type.backgroundColor" [style.--chip-text]="type.textColor">
              <mat-icon>category</mat-icon>
              <span>{{ type.name }}</span>
            </div>
          }
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

          <div class="date-grid full-width">
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
          </div>

          <mat-form-field appearance="outline" class="full-width field-description">
            <mat-label>Descripcion</mat-label>
            <textarea matInput rows="2" formControlName="description"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
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
      border-radius: 20px !important;
      background: transparent !important;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18) !important;
      overflow: hidden !important;
    }
    .dialog-shell {
      display: grid;
      background:
        radial-gradient(circle at top right, rgba(15, 157, 107, 0.1), transparent 32%),
        radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 28%),
        linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border: 1px solid #e5ecf4;
      border-radius: 20px;
    }
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin: 0;
      padding: 0.95rem 1rem 0.85rem;
      background: linear-gradient(135deg, #ecfdf5 0%, #f8fbff 68%);
      border-bottom: 1px solid #e7eef6;
    }
    .dialog-title-icon {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: #eef5ff;
      color: #3f70e8;
      display: grid;
      place-items: center;
      box-shadow: inset 0 0 0 1px #dbe5f0;
      flex-shrink: 0;
    }
    .dialog-title-icon .mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .dialog-title-block {
      display: grid;
      gap: 0.12rem;
      min-width: 0;
      flex: 1;
    }
    h2[mat-dialog-title] span {
      color: #18283f;
      font-size: 0.96rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .dialog-title-block small {
      color: #6d8099;
      font-size: 0.74rem;
      font-weight: 600;
      line-height: 1.35;
    }
    h2[mat-dialog-title] button {
      color: #6b7f98;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 10px;
      box-shadow: inset 0 0 0 1px rgba(107, 127, 152, 0.14);
    }
    .dialog-copy {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
      margin-bottom: 0.8rem;
    }
    .dialog-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.42rem;
      min-height: 30px;
      padding: 0 0.72rem;
      border-radius: 10px;
      background: #eef5ff;
      color: #4d6483;
      box-shadow: inset 0 0 0 1px #dbe5f0;
      font-size: 0.76rem;
      font-weight: 700;
    }
    .dialog-chip .mat-icon {
      width: 15px;
      height: 15px;
      font-size: 15px;
      color: inherit;
    }
    .dialog-chip--soft {
      background: color-mix(in srgb, var(--chip-accent, #ecfdf5) 22%, #ffffff);
      color: var(--chip-text, #0f172a);
    }
    mat-dialog-content {
      padding: 0 1rem 0.9rem;
      overflow: hidden;
    }
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.72rem;
      min-width: min(41rem, 100%);
    }
    .dialog-form mat-form-field,
    .full-width {
      width: 100%;
    }
    .dialog-form mat-form-field {
      --mat-form-field-container-height: 42px;
      --mat-form-field-container-vertical-padding: 9px;
      --mdc-outlined-text-field-outline-color: #dbe5f0;
      --mdc-outlined-text-field-hover-outline-color: #c9d8e9;
      --mdc-outlined-text-field-focus-outline-color: #0f9d6b;
      --mdc-filled-text-field-container-color: #f8fbff;
    }
    .dialog-form .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }
    .dialog-form .mat-mdc-text-field-wrapper {
      background: #f8fbff;
      border-radius: 12px;
    }
    .dialog-form .mat-mdc-form-field-infix {
      min-height: auto;
      padding-top: 0.62rem;
      padding-bottom: 0.62rem;
    }
    .dialog-form .mat-mdc-form-field-input-control,
    .dialog-form .mat-mdc-select-value-text,
    .dialog-form input,
    .dialog-form textarea {
      font-size: 0.8rem;
      font-weight: 600;
      color: #435973;
    }
    .dialog-form .mat-mdc-floating-label {
      color: #7d91ab;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .date-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 0.82fr;
      gap: 0.72rem;
      align-items: start;
    }
    .date-grid mat-form-field {
      width: 100%;
    }
    .field-description {
      --mat-form-field-container-height: 78px;
    }
    .field-description .mat-mdc-form-field-infix {
      padding-top: 0.7rem;
      padding-bottom: 0.55rem;
    }
    .field-description textarea {
      line-height: 1.4;
      resize: none;
    }
    .type-preview {
      margin-top: 0.55rem;
      padding: 0.78rem 0.92rem;
      border-radius: 14px;
      display: grid;
      gap: 0.18rem;
      box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
    }
    .type-preview strong {
      font-size: 0.82rem;
      font-weight: 800;
    }
    .type-preview span {
      font-size: 0.73rem;
      font-weight: 600;
      line-height: 1.35;
    }
    mat-dialog-actions {
      position: sticky;
      bottom: 0;
      display: flex;
      gap: 0.55rem;
      margin: 0;
      padding: 0.85rem 1rem 0.95rem;
      border-top: 1px solid rgba(226, 232, 240, 0.9);
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: blur(10px);
    }
    .delete-button {
      margin-right: auto;
      color: #b3261e;
      min-height: 40px;
      border-radius: 12px;
    }
    mat-dialog-actions button[mat-flat-button] {
      min-height: 40px;
      border-radius: 12px;
      padding-inline: 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      background: #0f9d6b;
      color: #ffffff;
      box-shadow: none;
    }
    mat-dialog-actions button[mat-stroked-button] {
      min-height: 40px;
      border-radius: 12px;
      border-color: #d8e3ef;
      color: #51667f;
      font-size: 0.8rem;
      font-weight: 700;
    }
    @media (max-width: 720px) {
      .dialog-form {
        grid-template-columns: 1fr;
        min-width: auto;
      }
      .date-grid {
        grid-template-columns: 1fr;
      }
      .dialog-copy {
        align-items: stretch;
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
