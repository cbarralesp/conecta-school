import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdministrationRoleCard, AdministrationRolesOverview } from '../../../core/models/administration.models';
import { AdministrationApiService } from '../../../core/services/administration-api.service';
import { AdministrationRoleCardComponent } from '../components/administration-role-card.component';
import { AdministrationRoleDetailDialogComponent } from '../components/administration-role-detail-dialog.component';
import { AdministrationShellComponent } from '../components/administration-shell.component';

@Component({
  selector: 'app-administration-roles-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
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
  readonly summaryCards = computed(() => {
    const roles = this.overview()?.roles ?? [];
    const totalUsers = roles.reduce((acc, role) => acc + role.userCount, 0);
    const fullAccess = roles.filter((role) => role.levelLabel.toLowerCase().includes('total') || role.levelLabel.toLowerCase().includes('completo')).length;
    const partialAccess = roles.filter((role) => role.permissions.some((permission) => permission.state === 'PARTIAL')).length;

    return [
      { label: 'Roles activos', value: roles.length, icon: 'admin_panel_settings', toneClass: 'sc-blue' },
      { label: 'Usuarios asignados', value: totalUsers, icon: 'groups', toneClass: 'sc-green' },
      { label: 'Acceso completo', value: fullAccess, icon: 'verified_user', toneClass: 'sc-violet' },
      { label: 'Roles mixtos', value: partialAccess, icon: 'tune', toneClass: 'sc-amber' }
    ];
  });

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
