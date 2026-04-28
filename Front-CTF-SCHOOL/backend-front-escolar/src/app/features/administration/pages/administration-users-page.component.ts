import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  AdministrationRoleCode,
  AdministrationUserStatus,
  AdministrationUserDetail,
  AdministrationUserListItem,
  AdministrationUsersOverview
} from '../../../core/models/administration.models';
import { AdministrationApiService } from '../../../core/services/administration-api.service';
import { AdministrationActionButtonsComponent, AdministrationIconAction } from '../components/administration-action-buttons.component';
import { AdministrationConfirmDialogComponent } from '../components/administration-confirm-dialog.component';
import { AdministrationShellComponent } from '../components/administration-shell.component';
import { AdministrationStatusBadgeComponent } from '../components/administration-status-badge.component';
import { AdministrationUserDetailDialogComponent } from '../components/administration-user-detail-dialog.component';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';

@Component({
  selector: 'app-administration-users-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    AdministrationActionButtonsComponent,
    AdministrationShellComponent,
    AdministrationStatusBadgeComponent,
    SummaryMetricCardComponent
  ],
  templateUrl: './administration-users-page.component.html',
  styleUrl: './administration-users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationUsersPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly administrationApi = inject(AdministrationApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly displayedColumns = ['user', 'email', 'role', 'status', 'actions'];
  readonly overview = signal<AdministrationUsersOverview | null>(null);
  readonly isLoading = signal(true);
  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    roleCode: ['' as '' | AdministrationRoleCode],
    status: ['' as '' | AdministrationUserStatus]
  });

  readonly summary = computed(() => this.overview()?.summary ?? []);
  readonly roleOptions = computed(() => this.overview()?.roles ?? []);
  readonly users = computed(() => this.overview()?.users ?? []);
  readonly summaryCards = computed(() =>
    this.summary().slice(0, 4).map((item, index) => ({
      ...item,
      icon: ['groups', 'check_circle', 'badge', 'insights'][index] ?? 'dashboard',
      toneClass: ['sc-blue', 'sc-green', 'sc-violet', 'sc-amber'][index] ?? 'sc-blue'
    }))
  );

  constructor() {
    this.loadOverview();
    this.filtersForm.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.loadOverview());
  }

  goToCreate(): void {
    void this.router.navigate(['/dashboard/administracion/nuevo-usuario']);
  }

  rolePillClass(user: AdministrationUserListItem): string {
    switch (user.roleCode) {
      case 'PROFESOR':
        return 'role-pill role-pill--teacher';
      case 'DIRECTOR':
        return 'role-pill role-pill--director';
      case 'SUPERADMIN':
        return 'role-pill role-pill--superadmin';
      case 'APODERADO':
        return 'role-pill role-pill--guardian';
      case 'INSPECTOR':
      case 'SECRETARIA':
      default:
        return 'role-pill role-pill--admin';
    }
  }

  handleAction(user: AdministrationUserListItem, actionKey: string): void {
    switch (actionKey) {
      case 'view':
        this.openDetail(user.id);
        break;
      case 'edit':
        void this.router.navigate(['/dashboard/administracion/nuevo-usuario'], { queryParams: { edit: user.id } });
        break;
      case 'block':
        this.confirmSensitiveAction('Bloquear usuario', `Se bloqueara el acceso de ${user.fullName}.`, 'Bloquear')
          .subscribe((confirmed) => confirmed && this.runUserAction(() => this.administrationApi.blockUser(user.id), 'Cuenta bloqueada correctamente'));
        break;
      case 'unblock':
        this.confirmSensitiveAction('Desbloquear usuario', `Se reactivara el acceso de ${user.fullName}.`, 'Desbloquear')
          .subscribe((confirmed) => confirmed && this.runUserAction(() => this.administrationApi.unblockUser(user.id), 'Cuenta desbloqueada correctamente'));
        break;
      case 'deactivate':
        this.confirmSensitiveAction('Desactivar usuario', `La cuenta de ${user.fullName} quedara inactiva.`, 'Desactivar')
          .subscribe((confirmed) => confirmed && this.runUserAction(() => this.administrationApi.setActiveState(user.id, false), 'Cuenta desactivada correctamente'));
        break;
      case 'activate':
        this.confirmSensitiveAction('Activar usuario', `La cuenta de ${user.fullName} volvera a estar activa.`, 'Activar')
          .subscribe((confirmed) => confirmed && this.runUserAction(() => this.administrationApi.setActiveState(user.id, true), 'Cuenta activada correctamente'));
        break;
      case 'delete':
        this.confirmSensitiveAction('Eliminar usuario', `Esta accion eliminara a ${user.fullName} del directorio administrativo.`, 'Eliminar')
          .subscribe((confirmed) => confirmed && this.runUserAction(() => this.administrationApi.deleteUser(user.id), 'Usuario eliminado correctamente'));
        break;
    }
  }

  rowActions(user: AdministrationUserListItem): AdministrationIconAction[] {
    const actions: AdministrationIconAction[] = [
      { key: 'view', icon: 'visibility', tooltip: 'Ver detalle', ariaLabel: 'Ver detalle del usuario' },
      { key: 'edit', icon: 'edit', tooltip: 'Editar usuario', ariaLabel: 'Editar usuario' }
    ];

    if (user.status === 'Bloqueado') {
      actions.push({ key: 'unblock', icon: 'lock_open', tooltip: 'Desbloquear', ariaLabel: 'Desbloquear usuario', color: 'primary' });
    } else {
      actions.push({ key: 'block', icon: 'lock', tooltip: 'Bloquear', ariaLabel: 'Bloquear usuario', color: 'warn' });
    }

    actions.push(
      user.status === 'Activo'
        ? { key: 'deactivate', icon: 'toggle_off', tooltip: 'Desactivar', ariaLabel: 'Desactivar usuario', color: 'warn' }
        : { key: 'activate', icon: 'toggle_on', tooltip: 'Activar', ariaLabel: 'Activar usuario', color: 'primary' }
    );

    actions.push({ key: 'delete', icon: 'delete', tooltip: 'Eliminar', ariaLabel: 'Eliminar usuario', color: 'warn' });

    return actions;
  }

  initials(fullName: string): string {
    return fullName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  private loadOverview(): void {
    this.isLoading.set(true);
    this.administrationApi.getUsersOverview({
      search: this.filtersForm.controls.search.value,
      roleCode: this.filtersForm.controls.roleCode.value,
      status: this.filtersForm.controls.status.value
    }).subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.showError(error, 'No fue posible cargar los usuarios del sistema');
      }
    });
  }

  private openDetail(userId: number): void {
    this.administrationApi.getUserById(userId).subscribe((user) => {
      if (!user) {
        this.snackBar.open('No fue posible obtener el detalle del usuario', 'Cerrar', { duration: 2600 });
        return;
      }

      this.dialog.open(AdministrationUserDetailDialogComponent, {
        width: '720px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: false,
        data: user as AdministrationUserDetail
      });
    });
  }

  private confirmSensitiveAction(title: string, message: string, confirmLabel: string) {
    return this.dialog.open(AdministrationConfirmDialogComponent, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: { title, message, confirmLabel }
    }).afterClosed();
  }

  private runUserAction(action: () => Observable<void>, successMessage: string): void {
    action().subscribe({
      next: () => {
        this.snackBar.open(successMessage, 'Cerrar', { duration: 2600 });
        this.loadOverview();
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No fue posible ejecutar la accion')
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(typeof error.error?.message === 'string' ? error.error.message : fallback, 'Cerrar', {
      duration: 3200
    });
  }
}
