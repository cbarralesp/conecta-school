import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ApplicationRole } from '../core/models/auth.models';
import { AuthService } from '../core/services/auth.service';
import { AuthStateService } from '../core/services/auth-state.service';

type ModernNavItem = {
  label: string;
  icon: string;
  route: string;
  key: string;
  badge?: number;
};

type ModernNavSection = {
  title: string;
  items: ModernNavItem[];
  collapsible?: boolean;
};

@Component({
  selector: 'app-teacher-modern-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatListModule],
  template: `
    <aside class="modern-sidebar" [class.modern-sidebar--dark]="darkMode">
      <div class="modern-sidebar__sections">
        @for (section of sections(); track section.title) {
          <section class="modern-sidebar__section">
            @if (section.collapsible) {
              <button type="button" class="modern-sidebar__section-toggle" (click)="toggleSection(section.title)">
                <span class="modern-sidebar__section-title">{{ section.title }}</span>
                <mat-icon>{{ isSectionExpanded(section) ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
            } @else {
              <span class="modern-sidebar__section-title modern-sidebar__section-title--static">{{ section.title }}</span>
            }

            @if (isSectionExpanded(section)) {
              <mat-nav-list class="modern-sidebar__list">
                @for (item of section.items; track item.route) {
                  <a
                    mat-list-item
                    [routerLink]="item.route"
                    routerLinkActive="is-active"
                    [routerLinkActiveOptions]="{ exact: item.key === activeItem }"
                    [class.is-selected]="activeItem === item.key"
                  >
                    <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                    <span matListItemTitle>{{ item.label }}</span>
                  </a>
                }
              </mat-nav-list>
            }
          </section>
        }
      </div>

      <button mat-button type="button" class="modern-sidebar__logout" (click)="logout()">
        <mat-icon>logout</mat-icon>
        Cerrar sesion
      </button>
    </aside>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .modern-sidebar {
      height: 100%;
      display: grid;
      grid-template-rows: 1fr auto;
      gap: 1rem;
      padding: 0;
      background: linear-gradient(180deg, #fbfdff 0%, #f3f7fd 100%);
      transition: color 180ms ease, border-color 180ms ease;
    }

    .modern-sidebar.modern-sidebar--dark {
      background: #1e293b;
    }

    .modern-sidebar__sections {
      display: grid;
      gap: 0.45rem;
      align-content: start;
      padding: 0 0.6rem 0;
    }

    .modern-sidebar__section {
      display: grid;
      gap: 0.15rem;
    }

    .modern-sidebar__section-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.2rem 0.65rem 0;
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .modern-sidebar__section-toggle .mat-icon {
      width: 0.95rem;
      height: 0.95rem;
      font-size: 0.95rem;
      color: #7c8fa6;
    }

    .modern-sidebar--dark .modern-sidebar__section-toggle .mat-icon {
      color: #93a4bc;
    }

    .modern-sidebar__section-title {
      padding: 0;
      color: #8a9cb5;
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.78;
    }

    .modern-sidebar--dark .modern-sidebar__section-title {
      color: rgba(148, 163, 184, 0.88);
    }

    .modern-sidebar__section-title--static {
      padding: 0.1rem 0.65rem 0;
    }

    .modern-sidebar__list {
      display: grid;
      gap: 0.08rem;
    }

    .modern-sidebar__list a[mat-list-item] {
      min-height: 42px;
      padding-inline: 0.7rem;
      border-radius: 10px;
      color: #475c7a;
      position: relative;
    }

    .modern-sidebar__list a[mat-list-item] .mat-mdc-list-item-icon {
      width: 18px;
      min-width: 18px;
      margin-right: 0.65rem;
    }

    .modern-sidebar__list a[mat-list-item] .mdc-list-item__primary-text,
    .modern-sidebar__list a[mat-list-item] [matListItemTitle] {
      font-size: 0.82rem;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    .modern-sidebar__list a[mat-list-item] .mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item] {
      color: #a8b6ca;
    }

    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item] .mdc-list-item__primary-text,
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item] [matListItemTitle] {
      color: #a8b6ca !important;
    }

    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item] .mat-icon {
      color: #b7c3d5;
    }

    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item]:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
    }

    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item]:hover .mdc-list-item__primary-text,
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item]:hover [matListItemTitle],
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item]:hover .mat-icon {
      color: #e2e8f0 !important;
    }

    .modern-sidebar__list a[mat-list-item].is-selected,
    .modern-sidebar__list a[mat-list-item].is-active {
      background: linear-gradient(180deg, #edf4ff 0%, #e5efff 100%);
      color: #1d5eb3;
      box-shadow: inset 0 0 0 1px rgba(29, 94, 179, 0.1);
    }

    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-selected,
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-active {
      background: #243b63;
      color: #ffffff;
      box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.18);
    }

    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-selected .mdc-list-item__primary-text,
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-active .mdc-list-item__primary-text,
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-selected [matListItemTitle],
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-active [matListItemTitle],
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-selected .mat-icon,
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-active .mat-icon {
      color: #ffffff !important;
    }

    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-selected::before,
    .modern-sidebar--dark .modern-sidebar__list a[mat-list-item].is-active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 18px;
      border-radius: 0 3px 3px 0;
      background: #3b82f6;
    }

    .modern-sidebar__list .mat-icon {
      color: inherit;
    }

    .modern-sidebar__logout {
      margin: 0 0.65rem 0.9rem;
      justify-content: flex-start;
      padding: 0.72rem 0.8rem;
      border-radius: 12px;
      color: #e34c4c !important;
      background: rgba(255, 255, 255, 0.72) !important;
      box-shadow: inset 0 0 0 1px rgba(227, 76, 76, 0.12);
      font-size: 0.82rem;
      font-weight: 500;
    }

    .modern-sidebar--dark .modern-sidebar__logout {
      color: #f87171 !important;
      background: rgba(255, 255, 255, 0.03) !important;
      box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.1);
    }

    @media (max-width: 1024px) {
      .modern-sidebar {
        gap: 0.9rem;
        padding-bottom: 0.9rem;
      }

      .modern-sidebar__sections {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: start;
      }
    }

    @media (max-width: 680px) {
      .modern-sidebar__sections {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherModernSidebarComponent {
  private readonly authStateService = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);
  private readonly expandedSections = signal<Record<string, boolean>>(this.loadExpandedSections());

  @Input() activeItem = 'dashboard';
  @Input() dashboardRoute = '/dashboard/moderno';
  @Input() coursesBadge = 0;
  @Input() planningBadge = 0;
  @Input() darkMode = false;

  protected readonly currentRole = computed<ApplicationRole>(() => this.authService.getUserRole() ?? 'TEACHER');

  protected readonly sections = computed<ModernNavSection[]>(() => {
    switch (this.currentRole()) {
      case 'STUDENT':
        return [
          {
            title: 'Mi espacio',
            collapsible: false,
            items: [
              { key: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', route: '/alumno' },
              { key: 'subjects', label: 'Asignaturas', icon: 'library_books', route: '/alumno/asignaturas' },
              { key: 'schedule', label: 'Horario', icon: 'schedule', route: '/alumno/horario' },
              { key: 'grades', label: 'Calificaciones', icon: 'grading', route: '/alumno/calificaciones' },
              { key: 'attendance', label: 'Asistencia', icon: 'fact_check', route: '/alumno/asistencia' },
              { key: 'activities', label: 'Actividades', icon: 'event', route: '/alumno/actividades' }
            ]
          }
        ];
      case 'ADMIN':
        return [
          {
            title: 'General',
            collapsible: false,
            items: [{ key: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', route: this.dashboardRoute }]
          },
          {
            title: 'Gestion academica',
            collapsible: true,
            items: [
              { key: 'enrollments', label: 'Matriculas', icon: 'assignment_ind', route: '/dashboard/matriculas' },
              { key: 'teachers', label: 'Profesores', icon: 'school', route: '/dashboard/profesores' },
              { key: 'courses', label: 'Cursos', icon: 'class', route: '/dashboard/cursos', badge: this.coursesBadge },
              { key: 'schedule', label: 'Horario', icon: 'schedule', route: '/dashboard/horario' },
              { key: 'subjects', label: 'Asignaturas', icon: 'menu_book', route: '/dashboard/asignaturas' }
            ]
          },
          {
            title: 'Docencia',
            collapsible: true,
            items: [
              { key: 'attendance', label: 'Asistencia', icon: 'fact_check', route: '/dashboard/asistencia' },
              { key: 'grades', label: 'Calificaciones', icon: 'grading', route: '/dashboard/calificaciones' },
              { key: 'activities', label: 'Actividades', icon: 'event_note', route: '/dashboard/actividades' },
              { key: 'planning', label: 'Planificacion', icon: 'edit_calendar', route: '/dashboard/planificacion', badge: this.planningBadge }
            ]
          },
          {
            title: 'Administracion',
            collapsible: true,
            items: [
              { key: 'users', label: 'Usuarios', icon: 'manage_accounts', route: '/dashboard/administracion/usuarios' },
              { key: 'roles', label: 'Roles', icon: 'admin_panel_settings', route: '/dashboard/administracion/roles' },
              { key: 'access-matrix', label: 'Matriz de acceso', icon: 'table_chart', route: '/dashboard/administracion/matriz-acceso' },
              { key: 'audit', label: 'Auditoria', icon: 'receipt_long', route: '/dashboard/administracion/auditoria' }
            ]
          }
        ];
      case 'TEACHER':
      default:
        return [
          {
            title: 'General',
            collapsible: false,
            items: [{ key: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', route: this.dashboardRoute }]
          },
          {
            title: 'Docencia',
            collapsible: true,
            items: [
              { key: 'courses', label: 'Cursos', icon: 'class', route: '/dashboard/cursos', badge: this.coursesBadge },
              { key: 'schedule', label: 'Horario', icon: 'schedule', route: '/dashboard/horario' },
              { key: 'attendance', label: 'Asistencia', icon: 'fact_check', route: '/dashboard/asistencia' },
              { key: 'grades', label: 'Calificaciones', icon: 'grading', route: '/dashboard/calificaciones' },
              { key: 'activities', label: 'Actividades', icon: 'event_note', route: '/dashboard/actividades' },
              { key: 'subjects', label: 'Asignaturas', icon: 'menu_book', route: '/dashboard/asignaturas' },
              { key: 'planning', label: 'Planificacion', icon: 'edit_calendar', route: '/dashboard/planificacion', badge: this.planningBadge }
            ]
          }
        ];
    }
  });

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });
  }

  protected logout(): void {
    this.authStateService.clearSession();
    void this.router.navigate(['/login']);
  }

  protected toggleSection(sectionTitle: string): void {
    const section = this.sections().find((item) => item.title === sectionTitle);
    if (!section?.collapsible) {
      return;
    }

    this.expandedSections.update((current) => {
      const next = { ...current, [sectionTitle]: !current[sectionTitle] };
      this.persistExpandedSections(next);
      return next;
    });
  }

  protected isSectionExpanded(section: ModernNavSection): boolean {
    if (!section.collapsible) {
      return true;
    }

    if (this.isSectionActive(section)) {
      return true;
    }

    return this.expandedSections()[section.title] ?? false;
  }

  private isSectionActive(section: ModernNavSection): boolean {
    const currentUrl = this.currentUrl();
    return section.items.some((item) => currentUrl.startsWith(item.route));
  }

  private loadExpandedSections(): Record<string, boolean> {
    try {
      const rawValue = window.localStorage.getItem('teacher-modern-sidebar-sections');
      return rawValue ? (JSON.parse(rawValue) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  }

  private persistExpandedSections(value: Record<string, boolean>): void {
    try {
      window.localStorage.setItem('teacher-modern-sidebar-sections', JSON.stringify(value));
    } catch {
      // Ignore storage write errors and keep the UI functional.
    }
  }
}
