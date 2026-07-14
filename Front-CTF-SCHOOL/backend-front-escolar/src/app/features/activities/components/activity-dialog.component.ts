import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  readOnly?: boolean;
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
    <div class="activity-modal" [class.activity-modal--compact-detail]="data.readOnly">
      <h2 mat-dialog-title class="activity-modal-header">
        <span class="activity-modal-header__title">
          Calendario de actividades - {{ data.readOnly ? 'Detalle de actividad' : (data.activity ? 'Editar actividad' : 'Nueva actividad') }}
        </span>
        <button mat-icon-button type="button" class="activity-modal-header__close" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <span class="activity-modal-header__close-icon" aria-hidden="true">&times;</span>
        </button>
      </h2>

      <mat-dialog-content class="activity-modal-body">
        <form [formGroup]="form" class="activity-form">
          <div class="activity-form-grid">
            <label class="activity-form-field">
              <span>Tipo de actividad</span>
              <div class="activity-control">
                <mat-icon class="activity-control__leading">school</mat-icon>
                <select formControlName="activityTypeId">
                  @for (type of sortedActivityTypes(); track type.id) {
                    <option [value]="type.id">{{ activityTypeDisplayName(type) }}</option>
                  }
                </select>
                <mat-icon class="activity-control__trailing">keyboard_arrow_down</mat-icon>
              </div>
            </label>

            <label class="activity-form-field">
              <span>T&iacute;tulo</span>
              <div class="activity-control">
                <mat-icon class="activity-control__leading">edit</mat-icon>
                <input type="text" formControlName="title" placeholder="Ej: Prueba Lenguaje">
              </div>
            </label>

            <label class="activity-form-field">
              <span>Fecha inicio</span>
              <div class="activity-control">
                <mat-icon class="activity-control__leading">event_note</mat-icon>
                <input type="date" formControlName="date">
                <mat-icon class="activity-control__trailing">calendar_month</mat-icon>
              </div>
            </label>

            <label class="activity-form-field">
              <span>Fecha t&eacute;rmino</span>
              <div class="activity-control">
                <mat-icon class="activity-control__leading">event_available</mat-icon>
                <input type="date" formControlName="endDate">
                <mat-icon class="activity-control__trailing">calendar_month</mat-icon>
              </div>
            </label>

            <label class="activity-form-field">
              <span>Hora</span>
              <div class="activity-control">
                <mat-icon class="activity-control__leading">schedule</mat-icon>
                <input type="time" formControlName="time">
                <mat-icon class="activity-control__trailing">schedule</mat-icon>
              </div>
            </label>

            @if (showLocation()) {
              <label class="activity-form-field">
                <span>Ubicaci&oacute;n</span>
                <div class="activity-control">
                  <mat-icon class="activity-control__leading">location_on</mat-icon>
                  <input type="text" formControlName="location" placeholder="Agregar ubicaci&oacute;n">
                  <mat-icon class="activity-control__trailing">place</mat-icon>
                </div>
              </label>
            } @else {
              <label class="activity-form-field">
                <span>&nbsp;</span>
                <button type="button" class="activity-location-button" (click)="showLocation.set(true)" [disabled]="data.readOnly">
                  <mat-icon>location_on</mat-icon>
                  {{ data.readOnly ? 'Sin ubicaci&oacute;n' : 'Agregar ubicaci&oacute;n' }}
                </button>
              </label>
            }
          </div>

          <label class="activity-textarea">
            <span>Descripci&oacute;n</span>
            <textarea formControlName="description" placeholder="- Lectura de palabras&#10;- Conteo de s&iacute;labas"></textarea>
          </label>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="activity-modal-footer">
        @if (data.readOnly) {
          <button mat-stroked-button type="button" class="secondary-action" (click)="dialogRef.close()">Volver</button>
        } @else if (data.activity) {
          <button mat-button type="button" class="delete-button" (click)="requestDelete()">
            Eliminar actividad
          </button>
        }
        @if (!data.readOnly) {
          <button mat-stroked-button type="button" class="secondary-action" (click)="dialogRef.close()">Cancelar</button>
          <button mat-flat-button type="button" class="primary-action" (click)="submit()">
            <mat-icon>save</mat-icon>
            {{ data.activity ? 'Guardar cambios' : 'Crear actividad' }}
          </button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .activity-dialog-backdrop {
      background: rgba(15, 23, 42, 0.42);
      backdrop-filter: blur(8px);
    }
    .cdk-overlay-pane.activity-dialog-panel {
      width: 1036px !important;
      max-width: calc(100vw - 2rem) !important;
    }
    .cdk-overlay-pane.activity-dialog-panel.activity-dialog-panel--compact-detail {
      width: min(720px, calc(100vw - 2rem)) !important;
    }
    .activity-dialog-panel .mat-mdc-dialog-surface {
      width: 100% !important;
      border-radius: 22px !important;
      background: transparent !important;
      box-shadow: 0 30px 90px rgba(15, 23, 42, 0.28) !important;
      overflow: hidden !important;
    }
    .activity-dialog-panel .mat-mdc-dialog-content {
      max-height: none !important;
      overflow: hidden !important;
    }
    .activity-modal {
      --activity-accent: #16a34a;
      --activity-accent-strong: #15803d;
      --activity-accent-soft: #dcfce7;
      --activity-accent-border: #bbf7d0;
      --activity-accent-shadow: rgba(22, 163, 74, 0.18);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      width: 100%;
      max-width: 1036px;
      height: min(88vh, 774px);
      max-height: min(92vh, 774px);
      background: #ffffff;
      border: 1px solid rgba(219, 229, 240, 0.92);
      border-radius: 28px;
      color: #102849;
      overflow: hidden;
      font-family: inherit;
    }
    .activity-modal-header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 96px;
      margin: 0;
      padding: 1.2rem 5.25rem 1.05rem;
      background: #ffffff;
      border-bottom: 1px solid #e5edf7;
      text-align: center;
    }
    .activity-modal-header__title {
      color: #183153;
      font-size: 1.08rem;
      line-height: 1.2;
      font-weight: 820;
      letter-spacing: -0.02em;
    }
    .activity-modal-header__close {
      position: absolute !important;
      top: 50%;
      right: 1.45rem;
      width: 48px !important;
      height: 48px !important;
      min-width: 48px !important;
      padding: 0 !important;
      display: inline-grid !important;
      place-items: center !important;
      color: #314866;
      background: #edf2f9 !important;
      border-radius: 50%;
      box-shadow: none !important;
      transform: translateY(-50%);
    }
    .activity-modal-header__close-icon {
      display: inline-block;
      font-size: 2rem;
      line-height: 1;
      font-weight: 300;
      transform: translateY(-1px);
    }
    .activity-modal-header__close:hover {
      transform: translateY(-50%);
      background: #e8eef7 !important;
    }
    .activity-modal-body {
      padding: 0 !important;
      max-height: none !important;
      min-height: 0;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      background: #ffffff;
      overscroll-behavior: contain;
    }
    .activity-form {
      display: grid;
      gap: 0.72rem;
      overflow: visible;
      padding: 1rem 1.9rem 0.9rem;
      min-width: 0;
    }

    .activity-modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.78rem;
      margin: 0;
      padding: 0.78rem 1.9rem 0.9rem;
      border-top: 1px solid #e5edf7;
      background: #ffffff;
    }
    .activity-form *,
    .activity-form *::before,
    .activity-form *::after {
      box-sizing: border-box;
    }

    .activity-form-field,
    .activity-textarea {
      display: grid;
      gap: 0.32rem;
    }

    .activity-form-field > span,
    .activity-textarea > span {
      color: #627799;
      font-size: 0.73rem;
      font-weight: 800;
      line-height: 1.18;
    }
    .activity-form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.58rem 1.2rem;
      min-width: 0;
    }
    .activity-form-field {
      min-width: 0;
    }
    .activity-control {
      display: grid;
      grid-template-columns: 50px minmax(0, 1fr) 34px;
      align-items: center;
      width: 100%;
      min-width: 0;
      height: 50px;
      border: 1px solid #d7e3f4;
      border-radius: 14px;
      background: #ffffff;
      color: #102849;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
    }
    .activity-control__leading {
      width: 32px;
      height: 32px;
      margin-left: 0.72rem;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: var(--activity-accent-soft, #dbeafe);
      color: var(--activity-accent, #2563eb);
      font-size: 18px;
    }
    .activity-control__trailing {
      width: 18px;
      height: 18px;
      margin-right: 0.72rem;
      color: #0f172a;
      font-size: 18px;
      pointer-events: none;
    }
    .activity-form input,
    .activity-form select {
      width: 100%;
      min-width: 0;
      height: 48px;
      border: 0;
      background: transparent;
      color: #102849;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 750;
      letter-spacing: 0;
      outline: 0;
      padding: 0 0.65rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .activity-form select {
      appearance: none;
      padding-right: 0.35rem;
    }
    .activity-form input:disabled,
    .activity-form select:disabled,
    .activity-textarea textarea:disabled {
      opacity: 1;
      cursor: default;
      -webkit-text-fill-color: #102849;
    }
    .activity-form input[type='date']::-webkit-calendar-picker-indicator,
    .activity-form input[type='time']::-webkit-calendar-picker-indicator {
      opacity: 0;
      display: none;
    }
    .activity-textarea textarea {
      width: 100%;
      max-width: 100%;
      height: 116px;
      border: 1px solid #d7e3f4;
      border-radius: 14px;
      background: #ffffff;
      color: #102849;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0;
      outline: 0;
      padding: 0.72rem 0.9rem;
      line-height: 1.36;
      resize: vertical;
    }
    .activity-form input:focus,
    .activity-form select:focus,
    .activity-textarea textarea:focus {
      box-shadow: inset 0 0 0 1px var(--activity-accent-border, #bfdbfe);
    }
    .activity-location-button {
      height: 50px;
      border: 1px solid #d7e3f4;
      border-radius: 14px;
      background: #ffffff;
      color: #15803d;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.46rem;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 800;
      cursor: pointer;
    }
    .activity-location-button .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .activity-location-button:disabled {
      cursor: default;
      color: #64748b;
      background: #ffffff;
    }
    .delete-button {
      margin-right: auto;
      border-color: #fecaca !important;
      background: #fff4f3 !important;
      color: #dc2626 !important;
      box-shadow: none !important;
    }
    .secondary-action {
      border-color: #ccdaef !important;
      color: #15803d !important;
      background: #ffffff !important;
    }
    .primary-action {
      min-width: 212px;
      background: var(--activity-accent, #16a34a) !important;
      color: #fff !important;
      box-shadow: 0 12px 24px var(--activity-accent-shadow, rgba(22, 163, 74, 0.18)) !important;
    }
    .primary-action .mat-icon,
    .secondary-action .mat-icon,
    .delete-button .mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      margin-right: 0.25rem;
    }

    .activity-modal-footer :is(.mat-mdc-button, .mat-mdc-unelevated-button, .mat-mdc-outlined-button) {
      min-width: 154px;
      height: 44px;
      border-radius: 14px !important;
      font-size: 0.8rem;
      font-weight: 800;
    }

    .activity-modal--compact-detail {
      max-width: 720px;
      height: auto;
      max-height: min(90vh, 560px);
      border-radius: 20px;
    }
    .activity-modal--compact-detail .activity-modal-header {
      min-height: 66px;
      padding: 0.8rem 3.8rem 0.72rem;
    }
    .activity-modal--compact-detail .activity-modal-header__title {
      font-size: 1.02rem;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -0.018em;
    }
    .activity-modal--compact-detail .activity-modal-header__close {
      right: 1rem;
      width: 34px !important;
      height: 34px !important;
      min-width: 34px !important;
    }
    .activity-modal--compact-detail .activity-modal-header__close-icon {
      font-size: 1.45rem;
    }
    .activity-modal--compact-detail .activity-form {
      gap: 0.75rem;
      padding: 0.9rem 1.15rem 0.95rem;
    }
    .activity-modal--compact-detail .activity-form-grid {
      gap: 0.68rem 0.8rem;
    }
    .activity-modal--compact-detail .activity-form-field,
    .activity-modal--compact-detail .activity-textarea {
      gap: 0.32rem;
    }
    .activity-modal--compact-detail .activity-form-field > span,
    .activity-modal--compact-detail .activity-textarea > span {
      color: #627795;
      font-size: 0.68rem;
      font-weight: 850;
      line-height: 1.15;
    }
    .activity-modal--compact-detail .activity-control {
      grid-template-columns: 40px minmax(0, 1fr) 32px;
      height: 42px;
      border-color: #d5e0ee;
      border-radius: 12px;
    }
    .activity-modal--compact-detail .activity-control__leading {
      width: 30px;
      height: 30px;
      margin-left: 0.5rem;
      border-radius: 9px;
      font-size: 18px;
    }
    .activity-modal--compact-detail .activity-control__trailing {
      width: 18px;
      height: 18px;
      margin-right: 0.5rem;
      font-size: 18px;
    }
    .activity-modal--compact-detail .activity-form input,
    .activity-modal--compact-detail .activity-form select {
      height: 40px;
      padding: 0 0.68rem;
      font-size: 0.8rem;
      font-weight: 850;
      line-height: 1.2;
    }
    .activity-modal--compact-detail .activity-location-button {
      height: 42px;
      border-color: #d5e0ee;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 850;
    }
    .activity-modal--compact-detail .activity-location-button .mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .activity-modal--compact-detail .activity-textarea textarea {
      height: 92px;
      max-height: 124px;
      border-color: #d5e0ee;
      border-radius: 12px;
      padding: 0.68rem 0.78rem;
      font-size: 0.8rem;
      font-weight: 750;
      line-height: 1.4;
    }
    .activity-modal--compact-detail .activity-modal-footer {
      justify-content: flex-end;
      padding: 0.72rem 1.15rem 0.9rem;
    }
    .activity-modal--compact-detail .activity-modal-footer .secondary-action {
      min-width: 116px;
      height: 38px;
      border-radius: 10px !important;
      font-size: 0.8rem;
      font-weight: 850;
    }

    @media (max-width: 720px) {
      .cdk-overlay-pane.activity-dialog-panel {
        width: calc(100vw - 1.25rem) !important;
        max-width: calc(100vw - 1.25rem) !important;
      }

      .activity-dialog-panel .mat-mdc-dialog-surface {
        max-height: calc(100dvh - 1.25rem) !important;
      }

      .activity-modal {
        width: 100%;
        height: min(92dvh, 760px);
        max-height: calc(100dvh - 1.25rem);
        border-radius: 24px;
      }

      .activity-modal-header {
        min-height: 78px;
        padding: 0.85rem 4.35rem 0.85rem 1.15rem;
      }

      .activity-modal-header__title {
        font-size: 1rem;
        line-height: 1.18;
      }

      .activity-modal-header__close {
        right: 1rem;
        width: 42px !important;
        height: 42px !important;
        min-width: 42px !important;
      }

      .activity-modal-header__close-icon {
        font-size: 1.8rem;
      }

      .activity-form-grid {
        grid-template-columns: 1fr;
        gap: 0.7rem;
      }

      .activity-form {
        gap: 0.7rem;
        padding: 0.85rem 1rem 1rem;
      }

      .activity-control {
        grid-template-columns: 46px minmax(0, 1fr) 30px;
        height: 50px;
      }

      .activity-control__leading {
        width: 30px;
        height: 30px;
        margin-left: 0.62rem;
      }

      .activity-control__trailing {
        margin-right: 0.62rem;
      }

      .activity-textarea textarea {
        height: 104px;
        min-height: 104px;
      }

      .activity-modal-footer {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.7rem;
        padding: 0.75rem 1rem 0.9rem;
        flex-wrap: nowrap;
      }

      .activity-modal-footer button:not(.delete-button) {
        width: 100%;
        min-width: 0;
      }

      .delete-button {
        width: 100%;
        margin-right: 0;
      }

      .activity-modal-footer :is(.mat-mdc-button, .mat-mdc-unelevated-button, .mat-mdc-outlined-button) {
        width: 100%;
        min-width: 0;
        height: 48px;
      }
    }

    @media (max-width: 420px) {
      .cdk-overlay-pane.activity-dialog-panel {
        width: calc(100vw - 0.75rem) !important;
        max-width: calc(100vw - 0.75rem) !important;
      }

      .activity-modal {
        height: calc(100dvh - 0.75rem);
        max-height: calc(100dvh - 0.75rem);
        border-radius: 22px;
      }

      .activity-modal-header {
        min-height: 72px;
        padding: 0.72rem 3.8rem 0.72rem 0.9rem;
      }

      .activity-modal-header__close {
        right: 0.75rem;
      }

      .activity-form {
        padding-inline: 0.9rem;
      }

      .activity-modal-footer {
        padding-inline: 0.9rem;
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

  readonly form = this.formBuilder.group({
    activityTypeId: [this.data.activity?.activityTypeId ?? this.data.activityTypes[0]?.id ?? 0, [Validators.required, Validators.min(1)]],
    title: [this.data.activity?.title ?? '', [Validators.required]],
    description: [this.data.activity?.description ?? ''],
    date: [this.data.activity?.date ?? this.data.selectedDate ?? '', [Validators.required]],
    endDate: [this.data.activity?.endDate ?? this.data.activity?.date ?? this.data.selectedDate ?? ''],
    time: [this.data.activity?.time ?? '08:30'],
    location: [this.data.activity?.location ?? '']
  });
  readonly showLocation = signal(Boolean(this.data.activity?.location?.trim()));
  private readonly selectedTypeId = toSignal(this.form.controls.activityTypeId.valueChanges, {
    initialValue: this.form.controls.activityTypeId.value
  });

  readonly sortedActivityTypes = computed(() =>
    this.data.activityTypes
      .filter((type) => type.code.trim().toUpperCase() !== 'SOCIAL')
      .sort((left, right) => left.name.localeCompare(right.name, 'es-CL'))
  );

  readonly selectedType = computed(
    () => this.data.activityTypes.find((type) => type.id === this.selectedTypeId()) ?? null
  );

  constructor() {
    if (this.data.readOnly) {
      this.form.disable({ emitEvent: false });
    }
  }

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
        activityTypeId: Number(rawValue.activityTypeId),
        courseId: this.selectedTypeIsTransversal() ? null : (this.data.activity?.courseId ?? this.data.courseId ?? null),
        title: (rawValue.title ?? '').trim(),
        description: rawValue.description?.trim() || '',
        date: rawValue.date ?? '',
        endDate: rawValue.endDate || null,
        time: rawValue.time || null,
        location: this.showLocation() ? (rawValue.location?.trim() || null) : null
      } satisfies CreateSchoolActivityRequest
    });
  }

  requestDelete(): void {
    this.dialogRef.close({ action: 'delete' });
  }

  activityTypeDisplayName(type: ActivityType): string {
    return type.code.trim().toUpperCase() === 'SUSPENSION' ? 'Suspension de clases' : type.name;
  }

  displayDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}-${month}-${year}` : value;
  }

  private selectedTypeIsTransversal(): boolean {
    const type = this.selectedType();
    if (!type) {
      return false;
    }

    return ['TRANSVERSAL', 'VACACIONES', 'FERIADO', 'INTERFERIADO', 'SUSPENSION'].includes(type.code.trim().toUpperCase());
  }
}
