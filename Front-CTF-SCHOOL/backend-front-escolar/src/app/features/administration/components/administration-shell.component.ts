import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherModernLayoutComponent } from '../../../shared/teacher-modern-layout.component';

type AdministrationTab = 'users' | 'roles' | 'matrix' | 'new-user' | 'audit';

@Component({
  selector: 'app-administration-shell',
  standalone: true,
  imports: [RouterLink, MatButtonModule, TeacherModernLayoutComponent],
  template: `
    <app-teacher-modern-layout
      [title]="toolbarTitle"
      activeItem="users"
      dashboardRoute="/dashboard"
      [userName]="userName()"
      [userRole]="userRole()"
    >
      <main class="administration-content">
        <section class="administration-subnav">
          <div class="administration-subnav__copy">
            <span class="administration-subnav__eyebrow">Administracion</span>
            <strong>{{ sectionTitle() }}</strong>
          </div>

          <div class="administration-subnav__tabs">
            @for (tab of tabs; track tab.route) {
              <a
                mat-stroked-button
                [routerLink]="tab.route"
                [class.active-tab]="activeTab === tab.key"
              >
                {{ tab.label }}
              </a>
            }
          </div>
        </section>

        <section class="administration-page-shell">
          <ng-content></ng-content>
        </section>
      </main>
    </app-teacher-modern-layout>
  `,
  styles: `
    .administration-content {
      display: grid;
      gap: 1rem;
      min-width: 0;
    }

    .administration-subnav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.2rem 0;
      flex-wrap: wrap;
    }

    .administration-subnav__copy {
      display: grid;
      gap: 0.18rem;
      min-width: 0;
    }

    .administration-subnav__eyebrow {
      color: #3b82f6;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .administration-subnav__copy strong {
      color: #0f172a;
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .administration-subnav__tabs {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.65rem;
      flex-wrap: wrap;
      min-width: 0;
    }

    .administration-subnav__tabs a[mat-stroked-button] {
      min-width: 0;
      min-height: 42px;
      padding: 0 0.95rem;
      font-size: 0.88rem;
      font-weight: 700;
      white-space: nowrap;
      border-radius: 14px !important;
      border-color: #d5dfed !important;
      background: rgba(255, 255, 255, 0.92) !important;
      color: #45617f !important;
      box-shadow: none !important;
    }

    .administration-subnav__tabs .active-tab {
      background: #eef4ff !important;
      border-color: #bfd4f8 !important;
      color: #1d5eb3 !important;
    }

    .administration-page-shell {
      display: grid;
      gap: 1rem;
      min-width: 0;
    }

    @media (max-width: 960px) {
      .administration-subnav {
        align-items: stretch;
      }

      .administration-subnav__tabs {
        width: 100%;
        justify-content: flex-start;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrationShellComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly router = inject(Router);

  @Input() activeTab: AdministrationTab = 'users';
  @Input() toolbarTitle = 'Administracion';

  protected readonly userName = computed(() => this.authStateService.user()?.nombre ?? 'Administrador');
  protected readonly userRole = computed(() => {
    const roleCode = this.authStateService.user()?.roleCode ?? this.authStateService.user()?.rol ?? 'ADMIN';
    return roleCode === 'SUPERADMIN' ? 'Superadmin' : 'Administrador';
  });
  protected readonly sectionTitle = computed(() => this.tabs.find((tab) => tab.key === this.activeTab)?.label ?? 'Usuarios');

  protected readonly tabs = [
    { key: 'users', label: 'Usuarios', route: '/dashboard/administracion/usuarios' },
    { key: 'roles', label: 'Roles', route: '/dashboard/administracion/roles' },
    { key: 'matrix', label: 'Matriz de acceso', route: '/dashboard/administracion/matriz-acceso' },
    { key: 'new-user', label: 'Nuevo usuario', route: '/dashboard/administracion/nuevo-usuario' },
    { key: 'audit', label: 'Auditoria', route: '/dashboard/administracion/auditoria' }
  ] satisfies Array<{ key: AdministrationTab; label: string; route: string }>;

  logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }
}
