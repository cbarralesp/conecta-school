import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AdministrationConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
}

@Component({
  selector: 'app-administration-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-shell">
      <div class="icon-wrap">
        <mat-icon>warning</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="dialogRef.close(false)">Cancelar</button>
        <button mat-flat-button color="warn" type="button" (click)="dialogRef.close(true)">{{ data.confirmLabel }}</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-shell {
      padding: 0.5rem 0.25rem;
    }

    .icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      background: #fceaea;
      color: #ba413e;
      margin-bottom: 0.9rem;
    }

    h2, p {
      margin: 0;
    }

    p {
      color: #5e728a;
      line-height: 1.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationConfirmDialogComponent {
  constructor(
    readonly dialogRef: MatDialogRef<AdministrationConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: AdministrationConfirmDialogData
  ) {}
}

