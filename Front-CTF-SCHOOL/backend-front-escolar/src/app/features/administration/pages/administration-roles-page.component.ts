import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdministrationRoleCard, AdministrationRolesOverview } from '../../../core/models/administration.models';
import { AdministrationApiService } from '../../../core/services/administration-api.service';
import { AdministrationHeroComponent } from '../components/administration-hero.component';
import { AdministrationRoleCardComponent } from '../components/administration-role-card.component';
import { AdministrationRoleDetailDialogComponent } from '../components/administration-role-detail-dialog.component';
import { AdministrationShellComponent } from '../components/administration-shell.component';

@Component({
  selector: 'app-administration-roles-page',
  standalone: true,
  imports: [
    MatDialogModule,
    MatSnackBarModule,
    AdministrationHeroComponent,
    AdministrationRoleCardComponent,
    AdministrationShellComponent
  ],
  templateUrl: './administration-roles-page.component.html',
  styleUrl: './administration-roles-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationRolesPageComponent {
  private readonly administrationApi = inject(AdministrationApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly overview = signal<AdministrationRolesOverview | null>(null);

  constructor() {
    this.administrationApi.getRolesOverview().subscribe({
      next: (overview) => this.overview.set(overview),
      error: () => this.snackBar.open('No fue posible cargar los roles', 'Cerrar', { duration: 2600 })
    });
  }

  openRoleDetail(role: AdministrationRoleCard): void {
    this.dialog.open(AdministrationRoleDetailDialogComponent, {
      width: '700px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: role
    });
  }

  roleIcon(roleCode: AdministrationRoleCard['code']): string {
    switch (roleCode) {
      case 'SUPERADMIN': return 'shield_person';
      case 'DIRECTOR': return 'workspace_premium';
      case 'INSPECTOR': return 'policy';
      case 'PROFESOR': return 'school';
      case 'SECRETARIA': return 'support_agent';
      case 'APODERADO': return 'family_restroom';
      default: return 'badge';
    }
  }
}

