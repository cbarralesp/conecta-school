import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-summary-metric-card',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  template: `
    <mat-card appearance="outlined" class="summary-card" [class]="resolvedToneClass()">
      <div class="summary-card__head">
        <div class="summary-card__icon">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
      </div>

      <div class="summary-card__copy">
        <span>{{ label }}</span>
        <strong>{{ value }}</strong>
      </div>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .summary-card {
      min-height: 116px;
      padding: 1rem 1.05rem;
      border-radius: 16px;
      border-color: #e5ecf4 !important;
      background: #ffffff !important;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .summary-card__head {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.9rem;
    }

    .summary-card__icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: grid;
      place-items: center;
    }

    .summary-card__icon .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }

    .summary-card__copy {
      display: grid;
      gap: 0.3rem;
      justify-items: center;
    }

    .summary-card__copy strong {
      color: #0f172a;
      font-size: 1.5rem;
      line-height: 1;
      font-weight: 800;
    }

    .summary-card__copy span {
      color: #8a9bb5;
      font-size: 0.76rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .tone-blue .summary-card__icon {
      background: #eff6ff;
      color: #3b82f6;
    }

    .tone-blue .summary-card__copy strong {
      color: #2f65e1;
    }

    .tone-green .summary-card__icon {
      background: #ecfdf5;
      color: #10b981;
    }

    .tone-green .summary-card__copy strong {
      color: #0f9d6b;
    }

    .tone-violet .summary-card__icon {
      background: #f5f3ff;
      color: #7c3aed;
    }

    .tone-violet .summary-card__copy strong {
      color: #6d28d9;
    }

    .tone-amber .summary-card__icon {
      background: #fffbeb;
      color: #f59e0b;
    }

    .tone-amber .summary-card__copy strong {
      color: #d97706;
    }

    .tone-red .summary-card__icon {
      background: #fef2f2;
      color: #ef4444;
    }

    .tone-red .summary-card__copy strong {
      color: #e3342f;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryMetricCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input({ required: true }) icon = 'dashboard';
  @Input() tone = 'blue';

  resolvedToneClass(): string {
    return `tone-${this.normalizeTone(this.tone)}`;
  }

  private normalizeTone(value: string): 'blue' | 'green' | 'violet' | 'amber' | 'red' {
    const normalized = value.trim().toLowerCase().replace(/^sc-/, '').replace(/^tone-/, '');
    if (normalized === 'primary' || normalized === 'blue') {
      return 'blue';
    }
    if (normalized === 'success' || normalized === 'green') {
      return 'green';
    }
    if (normalized === 'violet' || normalized === 'purple') {
      return 'violet';
    }
    if (normalized === 'warning' || normalized === 'yellow' || normalized === 'amber') {
      return 'amber';
    }
    if (normalized === 'rose' || normalized === 'red') {
      return 'red';
    }
    return 'blue';
  }
}
