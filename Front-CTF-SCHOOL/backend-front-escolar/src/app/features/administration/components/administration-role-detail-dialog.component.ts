import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AdministrationRoleCard } from '../../../core/models/administration.models';
import { AdministrationStatusBadgeComponent } from './administration-status-badge.component';

@Component({
  selector: 'app-administration-role-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, AdministrationStatusBadgeComponent],
  template: `
    <h2 mat-dialog-title>{{ data.name }}</h2>
    <mat-dialog-content class="detail-body">
      <p>{{ data.description }}</p>
      <div class="meta-row">
        <span>{{ data.levelLabel }}</span>
        <span>{{ data.userCount }} usuario{{ data.userCount === 1 ? '' : 's' }}</span>
      </div>
      <div class="permission-grid">
        @for (permission of data.permissions; track permission.label) {
          <div class="permission-item">
            <strong>{{ permission.label }}</strong>
            <app-administration-status-badge [permissionState]="permission.state"></app-administration-status-badge>
          </div>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close type="button">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .detail-body {
      display: grid;
      gap: 1rem;
      min-width: min(620px, 100%);
    }
    p {
      margin: 0;
      color: #5e728a;
      line-height: 1.55;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      color: #4c627d;
      font-weight: 700;
    }
    .permission-grid {
      display: grid;
      gap: 0.75rem;
    }
    .permission-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      padding: 0.8rem 0.9rem;
      border-radius: 16px;
      background: #f8fbff;
    }
    .permission-item strong {
      color: #20344d;
      font-size: 0.92rem;
    }
    @media (max-width: 680px) {
      .detail-body {
        min-width: 0;
      }
      .permission-item {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationRoleDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) readonly data: AdministrationRoleCard) {}
}

