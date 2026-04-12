import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  AdministrationAccessLevel,
  AdministrationPermissionState,
  AdministrationUserStatus
} from '../../../core/models/administration.models';

@Component({
  selector: 'app-administration-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="toneClass">{{ label }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      padding: 0.28rem 0.72rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .badge.success { background: #edf8dd; color: #5e8a13; }
    .badge.warning { background: #fdf0dd; color: #9d6414; }
    .badge.danger { background: #f9e5e5; color: #b24b47; }
    .badge.neutral { background: #edf3fa; color: #506682; }
    .badge.brand { background: #e4eefc; color: #1a5fa8; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationStatusBadgeComponent {
  @Input() label = '';
  @Input() tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brand' = 'neutral';

  @Input() set userStatus(value: AdministrationUserStatus | null | undefined) {
    if (!value) {
      return;
    }
    this.label = value;
    this.tone = value === 'Activo' ? 'success' : value === 'Bloqueado' ? 'danger' : value === 'Pendiente' ? 'warning' : 'neutral';
  }

  @Input() set accessLevel(value: AdministrationAccessLevel | null | undefined) {
    if (!value) {
      return;
    }

    const mapping: Record<AdministrationAccessLevel, { label: string; tone: AdministrationStatusBadgeComponent['tone'] }> = {
      FULL: { label: 'Completo', tone: 'success' },
      READ_ONLY: { label: 'RO', tone: 'brand' },
      PARTIAL: { label: 'Parcial', tone: 'warning' },
      NONE: { label: 'Sin acceso', tone: 'neutral' }
    };

    this.label = mapping[value].label;
    this.tone = mapping[value].tone;
  }

  @Input() set permissionState(value: AdministrationPermissionState | null | undefined) {
    if (!value) {
      return;
    }

    const mapping: Record<AdministrationPermissionState, { label: string; tone: AdministrationStatusBadgeComponent['tone'] }> = {
      ALLOWED: { label: 'Permitido', tone: 'success' },
      PARTIAL: { label: 'Parcial', tone: 'warning' },
      DENIED: { label: 'Sin acceso', tone: 'danger' }
    };

    this.label = mapping[value].label;
    this.tone = mapping[value].tone;
  }

  get toneClass(): string {
    return this.tone;
  }
}

