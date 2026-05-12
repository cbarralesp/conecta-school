import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthStateService } from '../core/services/auth-state.service';

@Component({
  selector: 'app-teacher-modern-toolbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <header class="modern-toolbar" [class.modern-toolbar--without-context]="!hasTitle">
      <div class="modern-toolbar__brand">
        <img src="/Logo-toolbar.png" alt="Torre Fuerte School" />
        <div class="modern-toolbar__brand-copy">
          <span>Colegio</span>
          <strong>Torre Fuerte School</strong>
          <small>Control institucional</small>
        </div>
      </div>

      @if (hasTitle) {
        <div class="modern-toolbar__context">
          <strong>{{ title }}</strong>
        </div>
      }

      <label class="modern-toolbar__search" aria-label="Buscar en el sistema">
        <mat-icon>search</mat-icon>
        <input
          type="text"
          [value]="searchValue()"
          [placeholder]="searchPlaceholder"
          (input)="searchValue.set(($any($event.target).value ?? '').toString())"
        />
      </label>

      <div class="modern-toolbar__actions">
        <button mat-icon-button type="button" class="modern-toolbar__icon" aria-label="Expandir vista" (click)="toggleFullscreen()">
          <mat-icon>{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
        </button>
        <button mat-icon-button type="button" class="modern-toolbar__icon modern-toolbar__icon--dot" aria-label="Notificaciones">
          <mat-icon>notifications</mat-icon>
        </button>
        <button
          mat-icon-button
          type="button"
          class="modern-toolbar__icon"
          [class.modern-toolbar__icon--active]="sidebarDarkMode"
          aria-label="Cambiar tema del sidebar"
          (click)="toggleSidebarTheme.emit()"
        >
          <mat-icon>{{ sidebarDarkMode ? 'dark_mode' : 'light_mode' }}</mat-icon>
        </button>

        <span class="modern-toolbar__user">
          <strong>{{ resolvedUserName }}</strong>
          <small>{{ resolvedUserRole }}</small>
        </span>

        <button
          mat-icon-button
          type="button"
          class="modern-toolbar__avatar-button"
          [matMenuTriggerFor]="teacherProfileMenu"
          aria-label="Abrir menu de perfil"
        >
          <span class="modern-toolbar__avatar">{{ initials }}</span>
        </button>
      </div>
    </header>

    <mat-menu #teacherProfileMenu="matMenu" xPosition="before">
      <button mat-menu-item type="button" disabled>
        <mat-icon>person</mat-icon>
        <span>Ver perfil</span>
      </button>
      <button mat-menu-item type="button" (click)="logout()">
        <mat-icon>logout</mat-icon>
        <span>Cerrar sesion</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .modern-toolbar {
      min-height: 60px;
      padding: 0 1rem 0 0;
      display: grid;
      grid-template-columns: 268px auto minmax(280px, 1fr) auto;
      gap: 0.9rem;
      align-items: center;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: none;
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .modern-toolbar.modern-toolbar--without-context {
      grid-template-columns: 268px minmax(280px, 1fr) auto;
    }

    .modern-toolbar__brand {
      height: 100%;
      padding: 0 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border-right: 1px solid #e2e8f0;
      min-width: 0;
      overflow: hidden;
    }

    .modern-toolbar__brand img {
      width: 36px;
      height: 36px;
      display: block;
      object-fit: contain;
      flex: 0 0 auto;
    }

    .modern-toolbar__brand-copy {
      display: grid;
      gap: 0.02rem;
      min-width: 0;
      line-height: 1.15;
      overflow: hidden;
    }

    .modern-toolbar__brand-copy span {
      color: #3b82f6;
      font-size: 0.56rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .modern-toolbar__brand-copy strong {
      color: #0f172a;
      font-size: 0.84rem;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.02em;
    }

    .modern-toolbar__brand-copy small {
      color: #64748b;
      font-size: 0.56rem;
      font-weight: 600;
    }

    .modern-toolbar__context strong {
      color: #223652;
      font-size: 0.92rem;
      line-height: 1.2;
      font-weight: 800;
    }

    .modern-toolbar__context {
      min-width: 0;
      padding-left: 0.1rem;
    }

    .modern-toolbar__search {
      min-height: 36px;
      padding: 0 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      border-radius: 9px;
      background: #f8fafc;
      box-shadow: inset 0 0 0 1.5px #e8ecf2;
      color: #94a3b8;
      max-width: 440px;
      justify-self: end;
      width: 100%;
    }

    .modern-toolbar__search input {
      width: 100%;
      border: 0;
      outline: 0;
      background: transparent;
      color: #334155;
      font-size: 0.78rem;
      font-weight: 500;
      font-family: inherit;
    }

    .modern-toolbar__search input::placeholder {
      color: #94a3b8;
      font-weight: 400;
    }

    .modern-toolbar__actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.1rem;
      min-width: 0;
    }

    .modern-toolbar__icon {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: transparent;
      box-shadow: none;
      color: #64748b;
    }

    .modern-toolbar__icon:hover {
      background: #f1f5f9;
      color: #334155;
    }

    .modern-toolbar__icon--active {
      background: #eef4ff;
      color: #2b67c6;
    }

    .modern-toolbar__icon--dot {
      position: relative;
    }

    .modern-toolbar__icon--dot::after {
      content: '';
      position: absolute;
      top: 6px;
      right: 6px;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #ef4444;
      box-shadow: 0 0 0 2px #fff;
    }

    .modern-toolbar__avatar {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 9px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      flex: 0 0 auto;
    }

    .modern-toolbar__avatar-button {
      width: 34px;
      height: 34px;
      padding: 0;
      border-radius: 9px;
      overflow: hidden;
      background: transparent;
      box-shadow: none;
      margin-left: 0.35rem;
    }

    .modern-toolbar__avatar-button:hover {
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.18);
    }

    .modern-toolbar__user {
      display: grid;
      text-align: left;
      line-height: 1.15;
      margin-left: 0.4rem;
    }

    .modern-toolbar__user strong {
      font-size: 0.82rem;
      font-weight: 700;
      color: #0f172a;
    }

    .modern-toolbar__user small {
      font-size: 0.68rem;
      color: #64748b;
    }

    @media (max-width: 1100px) {
      .modern-toolbar {
        padding: 0.7rem 1rem;
        grid-template-columns: 1fr auto;
        grid-template-areas:
          'brand actions'
          'context actions'
          'search search';
      }

      .modern-toolbar__brand {
        grid-area: brand;
        padding: 0;
        border-right: 0;
      }

      .modern-toolbar__context {
        grid-area: context;
      }

      .modern-toolbar__search {
        grid-area: search;
      }

      .modern-toolbar__actions {
        grid-area: actions;
      }
    }

    @media (max-width: 768px) {
      .modern-toolbar {
        gap: 0.8rem;
        grid-template-columns: 1fr;
        grid-template-areas:
          'brand'
          'context'
          'search'
          'actions';
      }

      .modern-toolbar__brand {
        padding: 0;
      }

      .modern-toolbar__actions {
        justify-content: space-between;
        flex-wrap: wrap;
      }

      .modern-toolbar__user {
        order: 2;
        width: calc(100% - 3rem);
      }

      .modern-toolbar__avatar-button {
        order: 1;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherModernToolbarComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly router = inject(Router);

  @Input() title = 'Dashboard profesor';
  @Input() searchPlaceholder = 'Buscar documentos, clases, unidades...';
  @Input() userName = 'Docente';
  @Input() userRole = 'Profesor';
  @Input() sidebarDarkMode = false;

  @Output() readonly toggleSidebarTheme = new EventEmitter<void>();

  protected readonly searchValue = signal('');
  protected readonly isFullscreen = signal(false);

  protected get hasTitle(): boolean {
    return this.title.trim().length > 0;
  }

  protected get resolvedUserName(): string {
    const sessionName = this.authStateService.user()?.nombre?.trim();
    const inputName = this.userName.trim();

    if (sessionName) {
      return sessionName;
    }

    return inputName || 'Docente';
  }

  protected get resolvedUserRole(): string {
    const sessionRole = this.authStateService.user()?.roleCode?.trim()
      ?? this.authStateService.user()?.rol?.trim();
    const inputRole = this.userRole.trim();

    if (sessionRole) {
      return sessionRole;
    }

    return inputRole || 'Docente';
  }

  protected get initials(): string {
    return this.resolvedUserName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0).toUpperCase())
      .join('');
  }

  protected toggleFullscreen(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      this.isFullscreen.set(false);
      return;
    }

    void document.documentElement.requestFullscreen();
    this.isFullscreen.set(true);
  }

  protected logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }
}
