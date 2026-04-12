import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { TeacherSideMenuComponent } from '../../../shared/teacher-side-menu.component';

type AdministrationTab = 'users' | 'roles' | 'matrix' | 'new-user' | 'audit';

@Component({
  selector: 'app-administration-shell',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatSidenavModule, MatToolbarModule, TeacherSideMenuComponent],
  template: `
    <mat-sidenav-container class="administration-shell">
      <mat-sidenav mode="side" opened class="administration-sidenav">
        <app-teacher-side-menu></app-teacher-side-menu>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="administration-toolbar">
          <span>{{ toolbarTitle }}</span>
          <span class="toolbar-spacer"></span>
          <section class="toolbar-switcher">
            @for (tab of tabs; track tab.route) {
              <a
                mat-stroked-button
                [routerLink]="tab.route"
                [class.active-tab]="activeTab === tab.key"
              >
                {{ tab.label }}
              </a>
            }
          </section>
          <button mat-stroked-button type="button" (click)="logout()">Cerrar sesion</button>
        </mat-toolbar>

        <main class="administration-content">
          <ng-content></ng-content>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .administration-shell {
      min-height: 100vh;
      width: 100%;
    }

    .administration-sidenav {
      width: var(--app-shell-sidebar-width);
      min-width: var(--app-shell-sidebar-width);
      max-width: var(--app-shell-sidebar-width);
      padding: var(--app-shell-sidebar-padding);
      background: var(--app-gradient-shell);
      border-right: 1px solid var(--app-border-color);
    }

    mat-sidenav-content {
      min-width: 0;
      overflow-x: hidden;
    }

    .administration-toolbar {
      position: sticky;
      top: 0;
      z-index: 12;
      display: flex;
      gap: 0.85rem;
      min-height: var(--app-toolbar-height);
      padding: 0 1.1rem;
      background: var(--app-toolbar-background);
      border-bottom: 1px solid rgba(17, 38, 71, 0.06);
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 20px rgba(17, 47, 94, 0.05);
      align-items: center;
      flex-wrap: nowrap;
    }

    .administration-toolbar > span:first-child {
      font-size: 0.98rem;
      font-weight: 600;
      color: #24364f;
    }

    .toolbar-spacer {
      flex: 1;
    }

    .toolbar-switcher {
      display: inline-flex;
      gap: 0.65rem;
      flex-wrap: nowrap;
      justify-content: flex-end;
      align-items: center;
      margin-right: 0.2rem;
      overflow-x: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .toolbar-switcher::-webkit-scrollbar {
      display: none;
    }

    .toolbar-switcher a[mat-stroked-button] {
      min-width: 0;
      min-height: 44px;
      padding: 0 1rem;
      font-size: 0.92rem;
      justify-content: center;
      white-space: nowrap;
      border-radius: 18px !important;
      border-color: rgba(20, 56, 103, 0.18) !important;
      background: rgba(255, 255, 255, 0.8) !important;
      color: #173553 !important;
    }

    .toolbar-switcher .active-tab {
      background: rgba(25, 83, 150, 0.12) !important;
      border-color: rgba(25, 83, 150, 0.3) !important;
      color: #0f5bb4 !important;
      box-shadow: inset 0 0 0 1px rgba(15, 91, 180, 0.06);
    }

    .administration-content {
      width: min(100%, var(--app-page-max-width));
      margin: 0 auto;
      padding: var(--app-page-padding-y) var(--app-page-padding-x) 2rem;
      display: grid;
      gap: 0.95rem;
      min-width: 0;
    }

    @media (max-width: 768px) {
      .administration-content {
        padding: 1rem;
      }

      .administration-toolbar {
        flex-wrap: wrap;
        align-items: stretch;
        row-gap: 0.55rem;
        padding-block: 0.75rem;
      }

      .toolbar-switcher {
        justify-content: flex-start;
        width: 100%;
        order: 3;
        padding-bottom: 0.1rem;
        overflow-x: auto;
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
