import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdministrationStatusBadgeComponent } from './administration-status-badge.component';

@Component({
  selector: 'app-administration-permission-legend',
  standalone: true,
  imports: [AdministrationStatusBadgeComponent],
  template: `
    <div class="legend">
      <div class="legend-item">
        <app-administration-status-badge [accessLevel]="'FULL'"></app-administration-status-badge>
        <span>lectura y escritura total</span>
      </div>
      <div class="legend-item">
        <app-administration-status-badge [accessLevel]="'READ_ONLY'"></app-administration-status-badge>
        <span>solo lectura</span>
      </div>
      <div class="legend-item">
        <app-administration-status-badge [accessLevel]="'PARTIAL'"></app-administration-status-badge>
        <span>acceso restringido a sus datos</span>
      </div>
      <div class="legend-item">
        <app-administration-status-badge [accessLevel]="'NONE'"></app-administration-status-badge>
        <span>sin acceso</span>
      </div>
    </div>
  `,
  styles: `
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      color: #526780;
      font-size: 0.86rem;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationPermissionLegendComponent {}
