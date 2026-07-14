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
  AdministrationRoleOption,
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
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly roleSummaryPage = signal(0);
  readonly pageSizeOptions = [10, 20, 50];
  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    roleCode: ['' as '' | AdministrationRoleCode],
    status: ['Activo' as '' | AdministrationUserStatus]
  });

  readonly summary = computed(() => this.overview()?.summary ?? []);
  readonly roleOptions = computed(() => this.overview()?.roles ?? []);
  readonly selectedRoleCode = computed(() => this.filtersForm.controls.roleCode.value);
  readonly selectedRole = computed(
    () => this.roleOptions().find((role) => role.code === this.selectedRoleCode()) ?? null
  );
  readonly users = computed(() => this.overview()?.users ?? []);
  readonly totalUsers = computed(() => this.users().length);
  readonly totalUsersByRole = computed(() =>
    this.roleOptions().reduce((acc, role) => acc + (role.userCount ?? 0), 0)
  );
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalUsers() / this.pageSize())));
  readonly pagedUsers = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.users().slice(start, start + this.pageSize());
  });
  readonly pageStart = computed(() => (this.totalUsers() === 0 ? 0 : this.pageIndex() * this.pageSize() + 1));
  readonly pageEnd = computed(() => Math.min(this.totalUsers(), this.pageStart() + this.pagedUsers().length - 1));
  readonly visibleActiveCount = computed(() => this.users().filter((user) => user.status === 'Activo').length);
  readonly visibleBlockedCount = computed(() => this.users().filter((user) => user.status === 'Bloqueado').length);
  readonly visiblePendingCount = computed(() => this.users().filter((user) => user.status === 'Pendiente').length);
  readonly roleSummaryRows = computed(() =>
    this.roleOptions().map((role) => ({
      code: role.code,
      name: role.name,
      userCount: role.userCount ?? 0,
      selected: role.code === this.selectedRoleCode()
    }))
  );
  readonly roleSummaryPageSize = 3;
  readonly roleSummaryTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.roleSummaryRows().length / this.roleSummaryPageSize))
  );
  readonly pagedRoleSummaryRows = computed(() => {
    const start = this.roleSummaryPage() * this.roleSummaryPageSize;
    return this.roleSummaryRows().slice(start, start + this.roleSummaryPageSize);
  });
  readonly summaryCards = computed(() => {
    const selectedRole = this.selectedRole();
    if (selectedRole) {
      return [
        { label: 'Rol seleccionado', value: selectedRole.name, icon: 'shield_person', toneClass: 'sc-violet' },
        { label: 'Usuarios del rol', value: selectedRole.userCount ?? 0, icon: 'groups', toneClass: 'sc-blue' },
        { label: 'Activos visibles', value: this.visibleActiveCount(), icon: 'check_circle', toneClass: 'sc-green' },
        { label: 'Bloqueados visibles', value: this.visibleBlockedCount(), icon: 'lock', toneClass: 'sc-amber' }
      ];
    }

    return this.summary().slice(0, 4).map((item, index) => ({
      ...item,
      icon: ['groups', 'check_circle', 'badge', 'insights'][index] ?? 'dashboard',
      toneClass: ['sc-blue', 'sc-green', 'sc-violet', 'sc-amber'][index] ?? 'sc-blue'
    }));
  });

  constructor() {
    this.loadOverview();
    this.filtersForm.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => {
      this.pageIndex.set(0);
      this.loadOverview();
    });
  }

  goToCreate(): void {
    void this.router.navigate(['/dashboard/administracion/nuevo-usuario']);
  }

  applyRoleFilter(roleCode: '' | AdministrationRoleCode): void {
    this.filtersForm.controls.roleCode.setValue(roleCode);
  }

  roleOptionLabel(role: AdministrationRoleOption): string {
    return `${role.name} (${role.userCount ?? 0})`;
  }

  goToPreviousRoleSummaryPage(): void {
    if (this.roleSummaryPage() > 0) {
      this.roleSummaryPage.update((value) => value - 1);
    }
  }

  goToNextRoleSummaryPage(): void {
    if (this.roleSummaryPage() < this.roleSummaryTotalPages() - 1) {
      this.roleSummaryPage.update((value) => value + 1);
    }
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
      case 'ASISTENTE':
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

  goToPreviousPage(): void {
    if (this.pageIndex() > 0) {
      this.pageIndex.update((value) => value - 1);
    }
  }

  goToNextPage(): void {
    if (this.pageIndex() < this.totalPages() - 1) {
      this.pageIndex.update((value) => value + 1);
    }
  }

  setPage(index: number): void {
    if (index >= 0 && index < this.totalPages()) {
      this.pageIndex.set(index);
    }
  }

  updatePageSize(rawValue: string): void {
    const nextSize = Number(rawValue);
    if (Number.isFinite(nextSize) && nextSize > 0) {
      this.pageSize.set(nextSize);
      this.pageIndex.set(0);
    }
  }

  visiblePages(): number[] {
    const total = this.totalPages();
    const current = this.pageIndex();
    const start = Math.max(0, current - 1);
    const end = Math.min(total - 1, start + 2);
    const normalizedStart = Math.max(0, end - 2);

    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
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
        const lastPageIndex = Math.max(0, Math.ceil((overview.users?.length ?? 0) / this.pageSize()) - 1);
        if (this.pageIndex() > lastPageIndex) {
          this.pageIndex.set(lastPageIndex);
        }
        const lastRolePageIndex = Math.max(0, Math.ceil((overview.roles?.length ?? 0) / this.roleSummaryPageSize) - 1);
        if (this.roleSummaryPage() > lastRolePageIndex) {
          this.roleSummaryPage.set(lastRolePageIndex);
        }
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
        width: '860px',
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
