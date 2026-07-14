import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ApplicationRole } from '../core/models/auth.models';
import { AuthService } from '../core/services/auth.service';
import { UserModuleAccessService } from '../core/services/user-module-access.service';
import { UserModuleAccessView } from '../core/models/module-access.models';

type NavigationItem = {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly exact?: boolean;
  readonly moduleCode?: string;
};

type NavigationSection = {
  readonly title: string;
  readonly items: readonly NavigationItem[];
  readonly collapsible?: boolean;
};

@Component({
  selector: 'app-teacher-side-menu',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatListModule],
  template: `
    <div class="brand-block">
      <div class="brand-mark">
        <img src="/Logo-toolbar.png" alt="Logo Torre Fuerte School" />
      </div>
      <div class="brand-copy">
        <h2>Torre Fuerte School</h2>
        <p>{{ subtitle() }}</p>
      </div>
    </div>

    <div class="menu-sections">
      @for (section of sectionStates(); track section.title) {
        <section class="menu-section" [class.is-open]="section.expanded" [class.is-active]="section.active">
          @if (section.collapsible) {
            <button type="button" class="section-toggle" (click)="toggleSection(section.title)">
              <span class="section-header">{{ section.title }}</span>
              <mat-icon>{{ section.expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
          } @else {
            <header class="section-static-header">
              <span class="section-header">{{ section.title }}</span>
            </header>
          }

          @if (section.expanded) {
            <mat-nav-list class="menu-list">
              @for (item of section.items; track item.route) {
                @if (isExactRoute(item)) {
                  <a
                    mat-list-item
                    [routerLink]="item.route"
                    routerLinkActive="active-link"
                    [routerLinkActiveOptions]="{ exact: true }"
                  >
                    <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                    <span matListItemTitle>{{ item.label }}</span>
                  </a>
                } @else {
                  <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link">
                    <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                    <span matListItemTitle>{{ item.label }}</span>
                  </a>
                }
              }
            </mat-nav-list>
          }
        </section>
      }
    </div>

    <div class="menu-footer">
      <span>{{ footerTitle() }}</span>
      <small>{{ footerDescription() }}</small>
    </div>
  `,
  styles: `
    .brand-block {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.75rem;
      align-items: center;
      padding: 0.72rem 0.78rem;
      margin-bottom: 0.55rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.6);
      box-shadow: inset 0 0 0 1px rgba(17, 38, 71, 0.05);
    }
    .brand-mark {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      padding: 0.3rem;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 6px 14px rgba(24, 86, 151, 0.08);
    }
    .brand-mark img {
      width: 92%;
      height: 92%;
      object-fit: contain;
      display: block;
    }
    .brand-copy {
      min-width: 0;
      display: grid;
      align-content: center;
    }
    .brand-block h2 {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.15;
      font-weight: 600;
      color: #173553;
    }
    .brand-block p {
      margin: 0.1rem 0 0;
      color: #67809e;
      font-size: 0.68rem;
      line-height: 1.3;
    }
    .menu-sections {
      display: grid;
      gap: 0.8rem;
      padding-top: 0.35rem;
    }
    .menu-section {
      display: grid;
      gap: 0.32rem;
    }
    .section-toggle,
    .section-static-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.2rem 0.7rem 0.05rem;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .section-toggle mat-icon {
      color: #7c8fa6;
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .menu-section.is-active .section-toggle mat-icon {
      color: #4b6f97;
    }
    .section-header {
      color: #7288a2;
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .menu-list {
      display: grid;
      gap: 0.18rem;
      padding-top: 0;
    }
    .menu-list a[mat-list-item] {
      min-height: 48px;
      border-radius: 16px;
      color: #20344d;
      transition: background-color 150ms ease, transform 150ms ease, color 150ms ease;
    }
    .menu-list a[mat-list-item]:hover {
      background: rgba(41, 85, 234, 0.06);
      color: #163b67;
    }
    .active-link {
      background: linear-gradient(180deg, rgba(41, 85, 234, 0.11) 0%, rgba(41, 85, 234, 0.07) 100%);
      border-radius: 16px;
      color: #173f74 !important;
      box-shadow: inset 0 0 0 1px rgba(41, 85, 234, 0.08);
    }
    .menu-footer {
      margin-top: 1.15rem;
      padding: 0.9rem 1rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.6);
      color: #173553;
      display: grid;
      gap: 0.18rem;
      box-shadow: inset 0 0 0 1px rgba(17, 38, 71, 0.05);
    }
    .menu-footer span {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .menu-footer small {
      color: #67809e;
      font-size: 0.74rem;
      line-height: 1.35;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherSideMenuComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly userModuleAccessService = inject(UserModuleAccessService);
  private readonly currentUrl = signal(this.router.url);
  private readonly expandedSections = signal<Record<string, boolean>>(this.loadExpandedSections());
  private readonly moduleAccessView = toSignal(this.userModuleAccessService.getSafeAccessView(), { initialValue: null });

  protected readonly currentRole = computed<ApplicationRole>(() => this.authService.getUserRole() ?? 'TEACHER');

  protected readonly navigationSections = computed<readonly NavigationSection[]>(() => {
    const sections = (() => {
      switch (this.currentRole()) {
      case 'STUDENT':
        return [
          {
            title: 'Mi espacio',
            items: [
              { label: 'Dashboard', icon: 'space_dashboard', route: '/alumno', exact: true },
              { label: 'Asignaturas', icon: 'library_books', route: '/alumno/asignaturas' },
              { label: 'Horario', icon: 'schedule', route: '/alumno/horario', exact: true },
              { label: 'Evaluaciones', icon: 'grading', route: '/alumno/calificaciónes', exact: true },
              { label: 'Asistencia', icon: 'fact_check', route: '/alumno/asistencia', exact: true },
              { label: 'Actividades', icon: 'event', route: '/alumno/actividades', exact: true }
            ]
          }
        ];
      case 'ADMIN':
        return [
          {
            title: 'General',
            items: this.visibleTeacherItems([
              { label: 'Dashboard', icon: 'space_dashboard', route: '/dashboard', exact: true, moduleCode: 'DASHBOARD' }
            ])
          },
          {
            title: 'Gestión académica',
            collapsible: true,
            items: this.visibleTeacherItems([
              { label: 'Matriculas', icon: 'assignment_ind', route: '/dashboard/matriculas', moduleCode: 'MATRICULAS' },
              { label: 'Docentes', icon: 'school', route: '/dashboard/profesores', moduleCode: 'PROFESORES' },
              { label: 'Cursos', icon: 'class', route: '/dashboard/cursos', moduleCode: 'CURSOS' },
              { label: 'Horario', icon: 'schedule', route: '/dashboard/horario', moduleCode: 'HORARIO' },
              { label: 'Asignaturas', icon: 'menu_book', route: '/dashboard/asignaturas', moduleCode: 'ASIGNATURAS' }
            ])
          },
          {
            title: 'Docencia',
            collapsible: true,
            items: this.visibleTeacherItems([
              { label: 'Asistencia', icon: 'fact_check', route: '/dashboard/asistencia', moduleCode: 'ASISTENCIA' },
              { label: 'Evaluaciones', icon: 'grading', route: '/dashboard/calificaciónes', moduleCode: 'CALIFICACIONES' },
              { label: 'Actividades', icon: 'event_note', route: '/dashboard/actividades', moduleCode: 'ACTIVIDADES' },
              { label: 'Planificaciones', icon: 'library_add_check', route: '/dashboard/planificaciones-nuevo', exact: true, moduleCode: 'PLANIFICACIONES' },
              { label: 'Contenido', icon: 'folder_copy', route: '/dashboard/contenido', moduleCode: 'CONTENIDO' },
              { label: 'Hoja de vida', icon: 'folder_shared', route: '/dashboard/hoja-vida', moduleCode: 'CALIFICACIONES' }
            ])
          },
          {
            title: 'Administración',
            collapsible: true,
            items: this.visibleTeacherItems([
              { label: 'Usuarios', icon: 'manage_accounts', route: '/dashboard/administracion/usuarios', exact: true, moduleCode: 'USUARIOS' },
              { label: 'Roles', icon: 'admin_panel_settings', route: '/dashboard/administracion/roles', moduleCode: 'ROLES' },
              { label: 'Matriz de acceso', icon: 'table_chart', route: '/dashboard/administracion/matriz-acceso', moduleCode: 'MATRIZ_ACCESO' },
              { label: 'Auditoria', icon: 'receipt_long', route: '/dashboard/administracion/auditoria', moduleCode: 'AUDITORIA' }
            ])
          }
        ];
      case 'TEACHER':
      default:
        return [
          {
            title: 'General',
            items: this.visibleTeacherItems([
              { label: 'Dashboard', icon: 'space_dashboard', route: '/profesor', exact: true, moduleCode: 'DASHBOARD' }
            ])
          },
          {
            title: 'Gestión académica',
            collapsible: true,
            items: this.visibleTeacherItems([
              { label: 'Matriculas', icon: 'assignment_ind', route: '/dashboard/matriculas', moduleCode: 'MATRICULAS' },
              { label: 'Docentes', icon: 'school', route: '/dashboard/profesores', moduleCode: 'PROFESORES' },
              { label: 'Cursos', icon: 'class', route: '/dashboard/cursos', moduleCode: 'CURSOS' },
              { label: 'Horario', icon: 'schedule', route: '/dashboard/horario', moduleCode: 'HORARIO' },
              { label: 'Asignaturas', icon: 'menu_book', route: '/dashboard/asignaturas', moduleCode: 'ASIGNATURAS' }
            ])
          },
          {
            title: 'Docencia',
            collapsible: true,
            items: this.visibleTeacherItems([
              { label: 'Asistencia', icon: 'fact_check', route: '/dashboard/asistencia', moduleCode: 'ASISTENCIA' },
              { label: 'Evaluaciones', icon: 'grading', route: '/dashboard/calificaciónes', moduleCode: 'CALIFICACIONES' },
              { label: 'Actividades', icon: 'event_note', route: '/dashboard/actividades', moduleCode: 'ACTIVIDADES' },
              { label: 'Planificaciones', icon: 'library_add_check', route: '/dashboard/planificaciones-nuevo', exact: true, moduleCode: 'PLANIFICACIONES' },
              { label: 'Contenido', icon: 'folder_copy', route: '/dashboard/contenido', moduleCode: 'CONTENIDO' },
              { label: 'Hoja de vida', icon: 'folder_shared', route: '/dashboard/hoja-vida', moduleCode: 'CALIFICACIONES' }
            ])
          },
          {
            title: 'Administración',
            collapsible: true,
            items: this.visibleTeacherItems([
              { label: 'Usuarios', icon: 'manage_accounts', route: '/dashboard/administracion/usuarios', moduleCode: 'USUARIOS' },
              { label: 'Roles', icon: 'admin_panel_settings', route: '/dashboard/administracion/roles', moduleCode: 'ROLES' },
              { label: 'Matriz de acceso', icon: 'table_chart', route: '/dashboard/administracion/matriz-acceso', moduleCode: 'MATRIZ_ACCESO' },
              { label: 'Auditoria', icon: 'receipt_long', route: '/dashboard/administracion/auditoria', moduleCode: 'AUDITORIA' }
            ])
          }
        ];
      }
    })();

    return sections.filter((section) => section.items.length > 0);
  });

  protected readonly sectionStates = computed(() =>
    this.navigationSections().map((section) => ({
      ...section,
      expanded: this.isSectionExpanded(section),
      active: this.isSectionActive(section)
    }))
  );

  protected readonly subtitle = computed(() => {
    switch (this.currentRole()) {
      case 'STUDENT':
        return 'Portal académico estudiantil';
      case 'ADMIN':
        return 'Control institucional y acceso completo al sistema';
      case 'TEACHER':
      default:
        return 'Seguimiento académico docente';
    }
  });

  protected readonly footerTitle = computed(() => {
    switch (this.currentRole()) {
      case 'STUDENT':
        return 'Portal estudiante';
      case 'ADMIN':
        return 'Acceso total';
      case 'TEACHER':
      default:
        return 'Plataforma docente';
    }
  });

  protected readonly footerDescription = computed(() => {
    switch (this.currentRole()) {
      case 'STUDENT':
        return 'Consulta tus cursos, horario, asistencia y evaluaciones desde un solo lugar.';
      case 'ADMIN':
        return 'Accede a administracion, modulos académicos y herramientas docentes desde un solo lugar.';
      case 'TEACHER':
      default:
        return 'Accede a tus cursos, horario, asistencia y evaluaciones con una navegación ordenada.';
    }
  });

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });
  }

  protected toggleSection(sectionTitle: string): void {
    const section = this.navigationSections().find((item) => item.title === sectionTitle);
    if (!section?.collapsible) {
      return;
    }

    this.expandedSections.update((current) => {
      const next = { ...current, [sectionTitle]: !current[sectionTitle] };
      this.persistExpandedSections(next);
      return next;
    });
  }

  protected isExactRoute(item: NavigationItem): boolean {
    return !!item.exact;
  }

  private isSectionExpanded(section: NavigationSection): boolean {
    if (!section.collapsible) {
      return true;
    }

    if (this.isSectionActive(section)) {
      return true;
    }

    return this.expandedSections()[section.title] ?? false;
  }

  private isSectionActive(section: NavigationSection): boolean {
    return section.items.some((item) => this.matchesRoute(item));
  }

  private matchesRoute(item: NavigationItem): boolean {
    const currentUrl = this.currentUrl();
    return item.exact ? currentUrl === item.route : currentUrl.startsWith(item.route);
  }

  private loadExpandedSections(): Record<string, boolean> {
    try {
      const rawValue = window.localStorage.getItem('teacher-sidebar-sections');
      return rawValue ? (JSON.parse(rawValue) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  }

  private persistExpandedSections(value: Record<string, boolean>): void {
    try {
      window.localStorage.setItem('teacher-sidebar-sections', JSON.stringify(value));
    } catch {
      // Ignore storage write errors and keep the UI functional.
    }
  }

  private visibleTeacherItems(items: readonly NavigationItem[]): NavigationItem[] {
    return this.userModuleAccessService.visibleItems(items, this.moduleAccessView() as UserModuleAccessView | null);
  }
}
