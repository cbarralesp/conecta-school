import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AdministrationUserDetail } from '../../../core/models/administration.models';
import { AdministrationStatusBadgeComponent } from './administration-status-badge.component';

@Component({
  selector: 'app-administration-user-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, AdministrationStatusBadgeComponent],
  template: `
    <button type="button" class="modal-close" (click)="close()">
      <mat-icon>close</mat-icon>
    </button>

    <section class="detail-shell">
      <aside class="detail-shell__identity">
        <div class="detail-avatar">{{ initials() }}</div>
        <h2>{{ data.fullName }}</h2>
        <span class="detail-role">{{ data.roleName }}</span>
      </aside>

      <section class="detail-shell__content">
        <header class="detail-heading">
          <mat-icon>badge</mat-icon>
          <span>Información de contacto</span>
        </header>

        <div class="role-desc">
          <mat-icon>info</mat-icon>
          <span>{{ data.roleDescription }}</span>
        </div>

        <div class="detail-grid">
          <div class="data-item">
            <span>Usuario</span>
            <strong>{{ data.username }}</strong>
          </div>
          <div class="data-item">
            <span>RUN</span>
            <strong class="mono">{{ data.run }}</strong>
          </div>
          <div class="data-item">
            <span>Email</span>
            <strong>{{ data.email }}</strong>
          </div>
          <div class="data-item">
            <span>Teléfono</span>
            <strong>{{ data.phone }}</strong>
          </div>
          <div class="data-item">
            <span>Estado</span>
            <app-administration-status-badge [userStatus]="data.status"></app-administration-status-badge>
          </div>
          <div class="data-item">
            <span>Último acceso</span>
            <strong>{{ data.lastAccessLabel }}</strong>
          </div>
        </div>

        <footer class="detail-actions">
          <button mat-stroked-button type="button" (click)="close()">Cerrar</button>
          <button mat-flat-button color="primary" type="button" (click)="edit()">Editar datos</button>
        </footer>
      </section>
    </section>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }

    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 5;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
      background: rgba(255, 255, 255, 0.92);
      color: #64748b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .modal-close:hover {
      color: #ef4444;
      border-color: #ef4444;
      background: #fff;
    }

    .modal-close .mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      display: block;
      line-height: 1;
    }

    .detail-shell {
      display: flex;
      min-width: min(820px, calc(100vw - 48px));
      background: #fff;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .detail-shell__identity {
      width: 300px;
      flex: 0 0 300px;
      background: #f1f5f9;
      border-right: 1px solid #e2e8f0;
      padding: 40px 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .detail-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 4px solid #fff;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 20px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }

    .detail-shell__identity h2 {
      margin: 0 0 10px;
      color: #1e293b;
      font-size: 1.25rem;
      line-height: 1.2;
      font-weight: 800;
    }

    .detail-role {
      padding: 6px 16px;
      border-radius: 999px;
      background: #fff;
      border: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 0.85rem;
      font-weight: 700;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .detail-shell__content {
      flex: 1;
      padding: 32px;
      display: grid;
      gap: 20px;
      align-content: center;
    }

    .detail-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1e293b;
      font-size: 1.05rem;
      font-weight: 700;
    }

    .detail-heading .mat-icon {
      color: #6366f1;
      font-size: 20px;
      width: 20px;
      height: 20px;
      display: block;
      line-height: 1;
    }

    .role-desc {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1e40af;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .role-desc .mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      display: block;
      line-height: 1;
      margin-top: 2px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px 36px;
    }

    .data-item {
      display: grid;
      gap: 4px;
    }

    .data-item span {
      color: #64748b;
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .data-item strong {
      color: #1e293b;
      font-size: 0.98rem;
      font-weight: 600;
    }

    .mono {
      font-family: 'Courier New', monospace;
      letter-spacing: -0.02em;
    }

    .detail-actions {
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    @media (max-width: 880px) {
      .detail-shell {
        min-width: 0;
        width: min(100vw - 32px, 680px);
        flex-direction: column;
      }

      .detail-shell__identity {
        width: 100%;
        flex-basis: auto;
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
      }
    }

    @media (max-width: 680px) {
      .detail-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .detail-shell__content {
        padding: 24px 20px;
      }

      .detail-actions {
        flex-direction: column-reverse;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationUserDetailDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: AdministrationUserDetail,
    private readonly dialogRef: MatDialogRef<AdministrationUserDetailDialogComponent>,
    private readonly router: Router
  ) {}

  initials(): string {
    return this.data.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  close(): void {
    this.dialogRef.close();
  }

  edit(): void {
    this.dialogRef.close();
    void this.router.navigate(['/dashboard/administracion/nuevo-usuario'], {
      queryParams: { edit: this.data.id }
    });
  }
}
