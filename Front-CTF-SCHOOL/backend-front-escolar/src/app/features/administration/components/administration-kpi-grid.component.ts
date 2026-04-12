import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AdministrationMetric } from '../../../core/models/administration.models';

@Component({
  selector: 'app-administration-kpi-grid',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <section class="summary-grid">
      @for (metric of items; track metric.label) {
        <mat-card appearance="outlined" class="summary-card">
          <span>{{ metric.label }}</span>
          <strong [class]="metric.tone ?? 'brand'">{{ metric.value }}</strong>
        </mat-card>
      }
    </section>
  `,
  styles: `
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .summary-card {
      padding: 0.1rem;
      box-shadow: none;
    }

    .summary-card span {
      display: block;
      color: var(--app-text-muted);
      font-size: 0.76rem;
    }

    .summary-card strong {
      display: block;
      margin-top: 0.25rem;
      font-size: 1.45rem;
    }

    .summary-card strong.brand { color: var(--app-brand-strong); }
    .summary-card strong.success { color: #5e8a13; }
    .summary-card strong.warning { color: #a26112; }
    .summary-card strong.danger { color: #b24b47; }
    .summary-card strong.neutral { color: #42566f; }

    @media (max-width: 1180px) {
      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 768px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationKpiGridComponent {
  @Input() items: AdministrationMetric[] = [];
}
