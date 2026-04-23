import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Subject } from '../../../core/models/subject.models';

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
    MatInputModule
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
        <p class="dialog-copy">Mantiene estandarizado el catalogo academico del sistema.</p>

        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline">
            <mat-label>Codigo</mat-label>
            <input matInput formControlName="code" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Area</mat-label>
            <input matInput formControlName="area" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Color</mat-label>
            <input matInput formControlName="colorHex" placeholder="#D7E8FB" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nivel de referencia</mat-label>
            <input matInput formControlName="referenceLevel" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Horas sugeridas</mat-label>
            <input matInput type="number" formControlName="suggestedHours" />
          </mat-form-field>

          <div class="span-2 color-palette">
            <span class="palette-label">Sugerencias pastel</span>
            <div class="palette-grid">
              @for (color of pastelColors; track color) {
                <button
                  type="button"
                  class="color-swatch"
                  [class.selected]="form.controls.colorHex.value === color"
                  [style.background]="color"
                  [attr.aria-label]="'Seleccionar color ' + color"
                  (click)="selectColor(color)">
                </button>
              }
            </div>
          </div>

          <mat-form-field appearance="outline" class="span-2">
            <mat-label>Descripcion</mat-label>
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
    .color-palette {
      display: grid;
      gap: 0.35rem;
      margin-top: -0.1rem;
    }
    .palette-label {
      color: #64748b;
      font-size: 0.76rem;
      font-weight: 700;
    }
    .palette-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.42rem;
    }
    .color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: 2px solid rgba(23, 53, 83, 0.08);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    .color-swatch:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
    }
    .color-swatch.selected {
      border-color: #1f5faa;
      box-shadow: 0 0 0 3px rgba(31, 95, 170, 0.16);
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
  private readonly formBuilder = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<SubjectDialogComponent>);
  readonly data = inject<SubjectDialogData | null>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  readonly pastelColors = [
    '#D7E8FB',
    '#E7F4D8',
    '#FCE7C8',
    '#F9DDE2',
    '#E8DDFC',
    '#D8F1EE',
    '#FBE8F2',
    '#FFF0C9',
    '#DCEAF7',
    '#E9E4D8'
  ];

  readonly form = this.formBuilder.nonNullable.group({
    code: [this.data.subject?.code ?? '', [Validators.required, Validators.maxLength(30)]],
    name: [this.data.subject?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    area: [this.data.subject?.area ?? '', [Validators.required, Validators.maxLength(120)]],
    colorHex: [
      this.data.subject?.colorHex ?? '#D7E8FB',
      [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]
    ],
    description: [this.data.subject?.description ?? '', [Validators.maxLength(500)]],
    referenceLevel: [this.data.subject?.referenceLevel ?? 'Ensenanza basica', [Validators.maxLength(80)]],
    suggestedHours: [this.data.subject?.suggestedHours ?? 2, [Validators.required, Validators.min(1), Validators.max(20)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }

  selectColor(colorHex: string): void {
    this.form.controls.colorHex.setValue(colorHex);
    this.form.controls.colorHex.markAsDirty();
    this.form.controls.colorHex.markAsTouched();
  }
}
