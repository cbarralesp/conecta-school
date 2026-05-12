import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-teacher-delete-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-shell">
      <div class="dialog-icon">
        <mat-icon>warning</mat-icon>
      </div>
      <h2 mat-dialog-title>Eliminar docente</h2>
      <mat-dialog-content>
        <p>
          Estas por eliminar permanentemente a <strong>{{ data.fullName }}</strong>. La accion eliminara su ficha,
          sus relaciones de cursos y asignaturas, y su acceso asociado al sistema si existe.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="dialogRef.close(false)">Cancelar</button>
        <button mat-flat-button color="warn" type="button" (click)="dialogRef.close(true)">Si, eliminar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-shell {
      padding: 0.4rem 0.1rem;
    }
    .dialog-icon {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      margin-bottom: 0.65rem;
      background: #fbe8e7;
      color: #b53b34;
    }
    h2[mat-dialog-title] {
      margin-bottom: 0.3rem;
      font-size: 1.35rem;
      font-weight: 700;
      color: #1d2b3e;
    }
    mat-dialog-content p {
      margin: 0;
      color: #506882;
      line-height: 1.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherDeleteDialogComponent {
  constructor(
    readonly dialogRef: MatDialogRef<TeacherDeleteDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: { fullName: string }
  ) {}
}
