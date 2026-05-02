import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import {
  AdministrationAccessLevel,
  AdministrationAccessMatrix,
  AdministrationRoleCode,
  AdministrationUserListItem
} from '../../../core/models/administration.models';
import { AdministrationApiService } from '../../../core/services/administration-api.service';
import { AdministrationShellComponent } from '../components/administration-shell.component';
import { SummaryMetricCardComponent } from '../../../shared/summary-metric-card.component';

type MatrixViewMode = 'matrix' | 'user';

type SummaryCard = {
  label: string;
  value: number | string;
  icon: string;
  toneClass: string;
};

@Component({
  selector: 'app-administration-access-matrix-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    AdministrationShellComponent,
    SummaryMetricCardComponent
  ],
  templateUrl: './administration-access-matrix-page.component.html',
  styleUrl: './administration-access-matrix-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationAccessMatrixPageComponent {
  private readonly administrationApi = inject(AdministrationApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly userSearch$ = new Subject<string>();

  readonly matrix = signal<AdministrationAccessMatrix | null>(null);
  readonly editableRows = signal<AdministrationAccessMatrix['rows']>([]);
  readonly roles = computed(() => this.matrix()?.roles ?? []);
  readonly viewMode = signal<MatrixViewMode>('matrix');
  readonly userSearch = signal('');
  readonly userResults = signal<AdministrationUserListItem[]>([]);
  readonly selectedUser = signal<AdministrationUserListItem | null>(null);
  readonly userOverrides = signal<Record<string, AdministrationAccessLevel>>({});
  readonly isSearchingUsers = signal(false);
  readonly isSaving = signal(false);
  readonly matrixDirty = signal(false);
  readonly userDirty = signal(false);

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const rows = this.editableRows();
    const roles = this.roles();
    const totalCells = rows.length * roles.length;
    let fullCount = 0;
    let readOnlyCount = 0;
    let partialCount = 0;

    rows.forEach((row) => {
      roles.forEach((role) => {
        const value = row.permissions[role.code];
        if (value === 'FULL') {
          fullCount += 1;
        } else if (value === 'READ_ONLY') {
          readOnlyCount += 1;
        } else if (value === 'PARTIAL') {
          partialCount += 1;
        }
      });
    });

    return [
      { label: 'Roles cargados', value: roles.length, icon: 'shield_person', toneClass: 'sc-blue' },
      { label: 'Modulos', value: rows.length, icon: 'grid_view', toneClass: 'sc-green' },
      { label: 'Acceso completo', value: fullCount, icon: 'verified', toneClass: 'sc-violet' },
      { label: 'Sin acceso', value: Math.max(totalCells - fullCount - readOnlyCount - partialCount, 0), icon: 'block', toneClass: 'sc-amber' }
    ];
  });

  readonly selectedUserPermissions = computed(() => {
      const user = this.selectedUser();
      const roleCode = user?.roleCode;
      if (!user || !roleCode) {
        return [];
      }

      return this.editableRows().map((row) => {
      const key = this.userOverrideKey(user.id, row.moduleCode);
      const override = this.userOverrides()[key];
      const inherited = row.permissions[roleCode];
      return {
        moduleCode: row.moduleCode,
        moduleName: row.moduleName,
        level: override ?? inherited,
        inherited,
        hasOverride: override !== undefined
      };
    });
  });

  constructor() {
    this.loadMatrix();

    this.userSearch$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term) => {
        const normalized = term.trim();
        if (normalized.length < 2) {
          this.userResults.set([]);
          this.isSearchingUsers.set(false);
          return of(null);
        }
        this.isSearchingUsers.set(true);
        return this.administrationApi.getUsersOverview({ search: normalized });
      })
    ).subscribe({
      next: (overview) => {
        if (!overview) {
          return;
        }
        this.userResults.set(overview.users);
        this.isSearchingUsers.set(false);
      },
      error: () => {
        this.userResults.set([]);
        this.isSearchingUsers.set(false);
        this.snackBar.open('No fue posible buscar usuarios', 'Cerrar', { duration: 2600 });
      }
    });
  }

  setViewMode(mode: MatrixViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'matrix') {
      this.userResults.set([]);
    }
  }

  updateUserSearch(value: string): void {
    this.userSearch.set(value);
    if (value.trim().length < 2) {
      this.userResults.set([]);
      if (!value.trim()) {
        this.selectedUser.set(null);
      }
      return;
    }
    this.userSearch$.next(value);
  }

  pickUser(user: AdministrationUserListItem): void {
    this.selectedUser.set(user);
    this.userSearch.set(user.fullName);
    this.userResults.set([]);
  }

  cycleMatrixPermission(moduleCode: string, roleCode: AdministrationRoleCode): void {
    if (roleCode === 'SUPERADMIN') {
      return;
    }

    this.editableRows.update((rows) =>
      rows.map((row) => {
        if (row.moduleCode !== moduleCode) {
          return row;
        }

        return {
          ...row,
          permissions: {
            ...row.permissions,
            [roleCode]: this.nextAccessLevel(row.permissions[roleCode])
          }
        };
      })
    );
    this.matrixDirty.set(true);
  }

  setUserPermission(moduleCode: string, level: AdministrationAccessLevel): void {
    const user = this.selectedUser();
    if (!user) {
      return;
    }

    const row = this.editableRows().find((item) => item.moduleCode === moduleCode);
    if (!row) {
      return;
    }

    const inherited = row.permissions[user.roleCode];
    const key = this.userOverrideKey(user.id, moduleCode);

    this.userOverrides.update((current) => {
      const next = { ...current };
      if (level === inherited) {
        delete next[key];
      } else {
        next[key] = level;
      }
      return next;
    });
    this.userDirty.set(true);
  }

  resetSelectedUser(): void {
    const user = this.selectedUser();
    if (!user) {
      return;
    }

    this.userOverrides.update((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${user.id}__`)) {
          delete next[key];
        }
      });
      return next;
    });
    this.userDirty.set(true);
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    if (!this.matrixDirty() && !this.userDirty()) {
      this.snackBar.open('No hay cambios pendientes', 'Cerrar', { duration: 2200 });
      return;
    }

    const payload = {
      rows: this.editableRows(),
      userOverrides: Object.entries(this.userOverrides()).map(([key, accessLevel]) => {
        const [userIdRaw, moduleCode] = key.split('__');
        return {
          userId: Number(userIdRaw),
          moduleCode,
          accessLevel
        };
      })
    };

    this.isSaving.set(true);
    this.administrationApi.saveAccessMatrix(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.matrixDirty.set(false);
        this.userDirty.set(false);
        this.snackBar.open('Matriz de accesos guardada correctamente', 'Cerrar', { duration: 2800 });
      },
      error: () => {
        this.isSaving.set(false);
        this.snackBar.open('No fue posible guardar la matriz de accesos', 'Cerrar', { duration: 3200 });
      }
    });
  }

  isMatrixPermission(level: AdministrationAccessLevel, moduleCode: string, roleCode: AdministrationRoleCode): boolean {
    return this.editableRows().find((row) => row.moduleCode === moduleCode)?.permissions[roleCode] === level;
  }

  roleLabel(roleCode: AdministrationRoleCode): string {
    return this.roles().find((role) => role.code === roleCode)?.name ?? roleCode;
  }

  initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  accessMeta(level: AdministrationAccessLevel): { label: string; icon: string; className: string; shortLabel: string } {
    switch (level) {
      case 'FULL':
        return { label: 'Completo', shortLabel: 'Completo', icon: 'done_all', className: 'perm-badge perm-badge--full' };
      case 'READ_ONLY':
        return { label: 'Lectura', shortLabel: 'Lectura', icon: 'visibility', className: 'perm-badge perm-badge--read' };
      case 'PARTIAL':
        return { label: 'Parcial', shortLabel: 'Parcial', icon: 'edit', className: 'perm-badge perm-badge--partial' };
      case 'NONE':
      default:
        return { label: 'Sin acceso', shortLabel: 'Sin acceso', icon: 'block', className: 'perm-badge perm-badge--none' };
    }
  }

  switcherClass(active: boolean, level: AdministrationAccessLevel): string {
    return `${active ? 'perm-switcher__option is-active' : 'perm-switcher__option'} perm-switcher__option--${level.toLowerCase()}`;
  }

  private loadMatrix(): void {
    this.administrationApi.getAccessMatrix().subscribe({
      next: (matrix) => {
        this.matrix.set(matrix);
        this.editableRows.set(matrix.rows.map((row) => ({
          ...row,
          permissions: { ...row.permissions }
        })));
        this.userOverrides.set(
          Object.fromEntries(
            (matrix.userOverrides ?? []).map((override) => [
              this.userOverrideKey(override.userId, override.moduleCode),
              override.accessLevel
            ])
          )
        );
      },
      error: () => this.snackBar.open('No fue posible cargar la matriz de acceso', 'Cerrar', { duration: 2600 })
    });
  }

  private nextAccessLevel(level: AdministrationAccessLevel): AdministrationAccessLevel {
    const order: AdministrationAccessLevel[] = ['NONE', 'READ_ONLY', 'PARTIAL', 'FULL'];
    const currentIndex = order.indexOf(level);
    return order[(currentIndex + 1) % order.length];
  }

  private userOverrideKey(userId: number, moduleCode: string): string {
    return `${userId}__${moduleCode}`;
  }
}
