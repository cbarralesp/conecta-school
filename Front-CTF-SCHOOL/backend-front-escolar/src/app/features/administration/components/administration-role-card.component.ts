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
        <div>
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
      gap: 0.9rem;
      padding: 1.2rem;
      border: 1px solid rgba(42, 78, 126, 0.1);
      border-radius: 22px;
      background: #fff;
    }

    .role-card__head,
    .role-card__footer,
    .permission-list li {
      display: flex;
    }

    .role-card__head {
      gap: 0.85rem;
      align-items: center;
    }

    .role-card__icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: #eef4ff;
      color: #285f9f;
    }

    h3 {
      margin: 0;
      font-size: 1.08rem;
      color: #1c2d42;
    }

    .role-card__head p,
    .role-card__description {
      margin: 0.2rem 0 0;
      color: #6a809a;
      font-size: 0.88rem;
      line-height: 1.5;
    }

    .permission-list {
      display: grid;
      gap: 0.45rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .permission-list li {
      gap: 0.55rem;
      align-items: center;
      color: #30455f;
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
      border-top: 1px solid rgba(42, 78, 126, 0.08);
    }

    .level-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.28rem 0.72rem;
      border-radius: 999px;
      background: #eef4ff;
      color: #5d58b8;
      font-size: 0.78rem;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationRoleCardComponent {
  @Input({ required: true }) role!: AdministrationRoleCard;
  @Input() icon = 'admin_panel_settings';

  @Output() readonly viewDetail = new EventEmitter<AdministrationRoleCard>();
}

