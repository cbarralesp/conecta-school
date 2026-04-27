import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdministrationRoleCard } from '../../../core/models/administration.models';

@Component({
  selector: 'app-administration-role-card',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <article class="role-card">
      <header class="role-card__head">
        <div class="role-card__icon">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        <div class="role-card__identity">
          <h3>{{ role.name }}</h3>
          <p>{{ role.userCount }} usuario{{ role.userCount === 1 ? '' : 's' }} · {{ role.scopeSummary }}</p>
        </div>
      </header>

      <p class="role-card__description">{{ role.description }}</p>

      <ul class="permission-list">
        @for (permission of role.permissions; track permission.label) {
          <li [class]="permission.state.toLowerCase()">
            <span class="dot"></span>
            <span>{{ permission.label }}</span>
          </li>
        }
      </ul>

      <footer class="role-card__footer">
        <span class="level-pill">{{ role.levelLabel }}</span>
        <button mat-stroked-button type="button" (click)="viewDetail.emit(role)">
          Ver detalle
        </button>
      </footer>
    </article>
  `,
  styles: `
    .role-card {
      display: grid;
      gap: 0.95rem;
      min-height: 100%;
      padding: 1.15rem;
      border: 1px solid #e5ecf4;
      border-radius: 16px;
      background: #fff;
      box-shadow: none;
    }

    .role-card__head,
    .role-card__footer,
    .permission-list li {
      display: flex;
    }

    .role-card__head {
      gap: 0.85rem;
      align-items: flex-start;
    }

    .role-card__icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: #eef4ff;
      color: #2f65e1;
      flex: 0 0 auto;
    }

    .role-card__icon .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }

    .role-card__identity {
      min-width: 0;
    }

    h3 {
      margin: 0;
      color: #1c2d42;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .role-card__head p {
      margin: 0.18rem 0 0;
      color: #6a809a;
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.45;
    }

    .role-card__description {
      margin: 0;
      color: #1c2d42;
      font-size: 0.84rem;
      font-weight: 500;
      line-height: 1.5;
    }

    .permission-list {
      display: grid;
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .permission-list li {
      gap: 0.55rem;
      align-items: center;
      color: #30455f;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      flex: 0 0 auto;
    }

    .allowed { color: #5e8a13; }
    .partial { color: #a26112; }
    .denied { color: #b24b47; }

    .role-card__footer {
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.85rem;
      border-top: 1px solid #edf2f7;
    }

    .level-pill {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0.28rem 0.72rem;
      border-radius: 999px;
      background: #eef4ff;
      color: #5d58b8;
      font-size: 0.76rem;
      font-weight: 800;
    }

    button[mat-stroked-button] {
      min-height: 36px;
      padding-inline: 0.95rem;
      border-radius: 10px !important;
      border-color: #d5dfed !important;
      background: #ffffff !important;
      color: #45617f !important;
      font-size: 0.78rem;
      font-weight: 800;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationRoleCardComponent {
  @Input({ required: true }) role!: AdministrationRoleCard;
  @Input() icon = 'admin_panel_settings';

  @Output() readonly viewDetail = new EventEmitter<AdministrationRoleCard>();
}
