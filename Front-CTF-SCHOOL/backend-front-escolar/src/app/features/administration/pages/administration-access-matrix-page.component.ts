import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import {
  AdministrationAccessLevel,
  AdministrationAccessMatrix
} from '../../../core/models/administration.models';
import { AdministrationApiService } from '../../../core/services/administration-api.service';
import { AdministrationHeroComponent } from '../components/administration-hero.component';
import { AdministrationPermissionLegendComponent } from '../components/administration-permission-legend.component';
import { AdministrationShellComponent } from '../components/administration-shell.component';
import { AdministrationStatusBadgeComponent } from '../components/administration-status-badge.component';

@Component({
  selector: 'app-administration-access-matrix-page',
  standalone: true,
  imports: [
    MatCardModule,
    AdministrationHeroComponent,
    AdministrationPermissionLegendComponent,
    AdministrationShellComponent,
    AdministrationStatusBadgeComponent
  ],
  templateUrl: './administration-access-matrix-page.component.html',
  styleUrl: './administration-access-matrix-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationAccessMatrixPageComponent {
  private readonly administrationApi = inject(AdministrationApiService);

  readonly matrix = signal<AdministrationAccessMatrix | null>(null);
  readonly roles = computed(() => this.matrix()?.roles ?? []);

  constructor() {
    this.administrationApi.getAccessMatrix().subscribe((matrix) => this.matrix.set(matrix));
  }

  accessLevel(row: AdministrationAccessMatrix['rows'][number], roleCode: AdministrationAccessMatrix['roles'][number]['code']): AdministrationAccessLevel {
    return row.permissions[roleCode];
  }
}

