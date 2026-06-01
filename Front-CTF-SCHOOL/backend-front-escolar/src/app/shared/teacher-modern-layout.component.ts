import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { TeacherModernSidebarComponent } from './teacher-modern-sidebar.component';
import { TeacherModernToolbarComponent } from './teacher-modern-toolbar.component';

@Component({
  selector: 'app-teacher-modern-layout',
  standalone: true,
  imports: [TeacherModernSidebarComponent, TeacherModernToolbarComponent],
  template: `
    <div class="modern-layout">
      <app-teacher-modern-toolbar
        class="modern-layout__toolbar"
        [title]="title"
        [searchPlaceholder]="searchPlaceholder"
        [userName]="userName"
        [userRole]="userRole"
        [sidebarDarkMode]="sidebarDarkMode()"
        (toggleSidebarTheme)="toggleSidebarTheme()"
      />

      <div class="modern-layout__shell">
        <app-teacher-modern-sidebar
          class="modern-layout__sidebar"
          [class.modern-layout__sidebar--dark]="sidebarDarkMode()"
          [activeItem]="activeItem"
          [dashboardRoute]="dashboardRoute"
          [coursesBadge]="coursesBadge"
          [planningBadge]="planningBadge"
          [darkMode]="sidebarDarkMode()"
        />

        <main class="modern-layout__content">
          <div class="modern-layout__content-inner">
          <ng-content />
          </div>
        </main>
      </div>
    </div>
  `,
  styles: `
    .modern-layout {
      min-height: 100vh;
      background: linear-gradient(180deg, #f4f8fd 0%, #eaf1fb 100%);
    }

    .modern-layout__toolbar {
      display: block;
    }

    .modern-layout__shell {
      min-height: calc(100vh - 60px);
      display: grid;
      grid-template-columns: 268px minmax(0, 1fr);
      align-items: start;
    }

    .modern-layout__sidebar {
      display: block;
      width: 268px;
      min-height: calc(100vh - 60px);
      align-self: start;
      position: sticky;
      top: 60px;
      border-right: 1px solid rgba(20, 56, 103, 0.08);
      background: linear-gradient(180deg, #fbfdff 0%, #f3f7fd 100%);
      transition: background-color 180ms ease, border-color 180ms ease;
    }

    .modern-layout__sidebar--dark {
      background: #1e293b;
      border-right-color: rgba(148, 163, 184, 0.14);
    }

    .modern-layout__content {
      min-width: 0;
      padding: 1rem 1.2rem 2rem;
      box-sizing: border-box;
    }

    .modern-layout__content-inner {
      width: min(100%, 1400px);
      margin: 0 auto;
    }

    @media (max-width: 1024px) {
      .modern-layout__shell {
        grid-template-columns: 1fr;
      }

      .modern-layout__sidebar {
        width: auto;
        min-height: auto;
        position: static;
        border-right: 0;
        border-bottom: 1px solid rgba(20, 56, 103, 0.08);
      }

      .modern-layout__content {
        padding: 1rem 1rem 1.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherModernLayoutComponent {
  private static readonly SIDEBAR_THEME_KEY = 'teacher-modern-sidebar-dark-mode';

  protected readonly sidebarDarkMode = signal(this.loadSidebarThemePreference());

  @Input() title = 'Dashboard profesor';
  @Input() searchPlaceholder = 'Buscar documentos, clases, unidades...';
  @Input() userName = 'Docente';
  @Input() userRole = 'Profesor';
  @Input() activeItem = 'dashboard';
  @Input() dashboardRoute = '/dashboard/moderno';
  @Input() coursesBadge = 0;
  @Input() planningBadge = 0;

  protected toggleSidebarTheme(): void {
    this.sidebarDarkMode.update((value) => {
      const next = !value;
      this.persistSidebarThemePreference(next);
      return next;
    });
  }

  private loadSidebarThemePreference(): boolean {
    try {
      const storedValue = window.localStorage.getItem(TeacherModernLayoutComponent.SIDEBAR_THEME_KEY);
      return storedValue == null ? true : storedValue === 'true';
    } catch {
      return true;
    }
  }

  private persistSidebarThemePreference(value: boolean): void {
    try {
      window.localStorage.setItem(TeacherModernLayoutComponent.SIDEBAR_THEME_KEY, String(value));
    } catch {
      // Ignore storage write errors and keep the UI functional.
    }
  }
}
