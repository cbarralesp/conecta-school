import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      padding: 0.85rem 1rem 0.45rem;
      font-size: 1.1rem;
    }
    .dialog-copy {
      margin: 0 0 0.5rem;
      color: #64748b;
      font-size: 0.75rem;
      line-height: 1.35;
    }
    mat-dialog-content {
      padding: 0 1rem 0.55rem;
      max-height: 70vh;
    }
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
      min-width: min(38rem, 100%);
    }
    .dialog-form .mat-mdc-form-field {
      font-size: 0.8rem;
      --mat-form-field-container-height: 42px;
      --mat-form-field-container-vertical-padding: 9px;
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
      margin-top: -0.15rem;
    }
    .palette-label {
      color: #64748b;
      font-size: 0.73rem;
      font-weight: 600;
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
      padding: 0.45rem 1rem 0.85rem;
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
