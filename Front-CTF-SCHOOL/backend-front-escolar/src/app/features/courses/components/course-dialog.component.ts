import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Course } from '../../../core/models/course.models';

interface CourseDialogData {
  course?: Course;
}

@Component({
  selector: 'app-course-dialog',
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
        <span>{{ data.course ? 'Editar curso' : 'Nuevo curso' }}</span>
        <button mat-icon-button type="button" (click)="dialogRef.close()" aria-label="Cerrar dialogo">
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <div class="dialog-copy">
          <p>Actualiza la informacion academica del curso sin perder visibilidad del formulario completo.</p>
        </div>

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
            <mat-label>Nivel</mat-label>
            <input matInput formControlName="level" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Letra</mat-label>
            <input matInput formControlName="letter" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Año escolar</mat-label>
            <input matInput type="number" formControlName="schoolYear" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Jornada</mat-label>
            <input matInput formControlName="scheduleType" />
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
    .dialog-shell {
      display: grid;
    }
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      padding: 1.4rem 1.5rem 1rem;
    }
    .dialog-copy {
      margin-bottom: 1rem;
    }
    .dialog-copy p {
      margin: 0;
      color: #62718a;
      line-height: 1.6;
    }
    mat-dialog-content {
      padding: 0 1.5rem 1rem;
      overflow: auto;
    }
    .dialog-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      min-width: min(52rem, 100%);
      padding-top: 0.35rem;
    }
    .dialog-form mat-form-field {
      width: 100%;
    }
    mat-dialog-actions {
      position: sticky;
      bottom: 0;
      margin: 0;
      padding: 1rem 1.5rem 1.4rem;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, #fff 35%);
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
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }
}
