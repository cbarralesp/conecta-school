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
      <div class="dialog-header">
        <div class="icon-wrap">
          <mat-icon>warning</mat-icon>
        </div>
        <div class="dialog-copy">
          <h2 mat-dialog-title>{{ data.title }}</h2>
          <mat-dialog-content>
            <p>{{ data.message }}</p>
          </mat-dialog-content>
        </div>
      </div>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" class="dialog-button dialog-button--ghost" (click)="dialogRef.close(false)">
          Cancelar
        </button>
        <button mat-flat-button color="warn" type="button" class="dialog-button dialog-button--danger" (click)="dialogRef.close(true)">
          {{ data.confirmLabel }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-shell {
      width: min(100%, 390px);
      padding: 0.5rem 0.6rem 0.7rem;
      font-family: inherit;
      color: #12233d;
      box-sizing: border-box;
    }

    .dialog-header {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr);
      gap: 0.9rem;
      align-items: start;
    }

    .icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      display: grid;
      place-items: center;
      background: #fbefec;
      color: #bf6a5f;
      flex-shrink: 0;
    }

    .icon-wrap .mat-icon {
      width: 17px;
      height: 17px;
      font-size: 17px;
    }

    .dialog-copy {
      min-width: 0;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      padding: 0;
      font-size: 1rem;
      font-weight: 750;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: #12233d;
    }

    mat-dialog-content {
      padding: 0.3rem 0 0 !important;
      margin: 0 !important;
      max-height: none;
      overflow: visible;
    }

    p {
      font-size: 0.8rem;
      font-weight: 560;
      line-height: 1.35;
      color: #667892;
    }

    mat-dialog-actions {
      width: 100%;
      padding: 1rem 0 0 !important;
      margin: 0 !important;
      gap: 0.65rem;
      justify-content: center;
      box-sizing: border-box;
    }

    .dialog-button {
      min-width: 110px;
      min-height: 38px;
      border-radius: 11px;
      font-family: inherit;
      font-size: 0.76rem;
      font-weight: 760;
      letter-spacing: -0.01em;
      box-shadow: none;
      padding-inline: 1rem;
    }

    .dialog-button--ghost {
      border-color: #c9d7ea !important;
      color: #49617f !important;
      background: #f8fbff !important;
    }

    .dialog-button--danger {
      background: linear-gradient(135deg, #d95b52, #c9483f) !important;
      color: #ffffff !important;
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
