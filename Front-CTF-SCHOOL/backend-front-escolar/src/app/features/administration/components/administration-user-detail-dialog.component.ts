import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AdministrationUserDetail } from '../../../core/models/administration.models';
import { AdministrationStatusBadgeComponent } from './administration-status-badge.component';

@Component({
  selector: 'app-administration-user-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, AdministrationStatusBadgeComponent],
  template: `
    <h2 mat-dialog-title>{{ data.fullName }}</h2>
    <mat-dialog-content class="detail-grid">
      <div>
        <span>Usuario</span>
        <strong>{{ data.username }}</strong>
      </div>
      <div>
        <span>Email</span>
        <strong>{{ data.email }}</strong>
      </div>
      <div>
        <span>RUN</span>
        <strong>{{ data.run }}</strong>
      </div>
      <div>
        <span>Telefono</span>
        <strong>{{ data.phone }}</strong>
      </div>
      <div>
        <span>Rol</span>
        <strong>{{ data.roleName }}</strong>
      </div>
      <div>
        <span>Estado</span>
        <app-administration-status-badge [userStatus]="data.status"></app-administration-status-badge>
      </div>
      <div class="full">
        <span>Alcance del rol</span>
        <strong>{{ data.roleDescription }}</strong>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close type="button">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      min-width: min(680px, 100%);
    }

    .detail-grid div {
      display: grid;
      gap: 0.25rem;
    }

    .detail-grid span {
      color: #667a93;
      font-size: 0.8rem;
    }

    .detail-grid strong {
      color: #1c2d42;
      font-size: 0.96rem;
    }

    .full {
      grid-column: 1 / -1;
    }

    @media (max-width: 680px) {
      .detail-grid {
        grid-template-columns: 1fr;
        min-width: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationUserDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) readonly data: AdministrationUserDetail) {}
}

