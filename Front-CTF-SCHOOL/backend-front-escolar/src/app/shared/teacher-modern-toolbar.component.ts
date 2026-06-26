import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthStateService } from '../core/services/auth-state.service';

type ToolbarSearchEntry = {
  label: string;
  description: string;
  route: string;
  icon: string;
  keywords: string[];
};

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

      <div class="modern-toolbar__search-shell">
        <label class="modern-toolbar__search" aria-label="Buscar en el sistema">
          <mat-icon>search</mat-icon>
          <input
            type="text"
            [value]="searchValue()"
            [placeholder]="searchPlaceholder"
            (focus)="openSearchResults()"
            (blur)="closeSearchResultsSoon()"
            (keydown)="handleSearchKeydown($event)"
            (input)="updateSearchValue(($any($event.target).value ?? '').toString())"
          />
        </label>

        @if (showSearchResults()) {
          <div class="modern-toolbar__search-results">
            @for (result of searchResults(); track result.route) {
              <button
                type="button"
                class="modern-toolbar__search-result"
                (mousedown)="navigateToSearchResult(result)">
                <span class="modern-toolbar__search-result-icon">
                  <mat-icon>{{ result.icon }}</mat-icon>
                </span>
                <span class="modern-toolbar__search-result-copy">
                  <strong>{{ result.label }}</strong>
                  <small>{{ result.description }}</small>
                </span>
              </button>
            }
          </div>
        }
      </div>

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
          <strong>{{ shortUserName }}</strong>
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

    .modern-toolbar__search-shell {
      position: relative;
      justify-self: end;
      width: 100%;
      max-width: 440px;
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

    .modern-toolbar__search-results {
      position: absolute;
      top: calc(100% + 0.45rem);
      left: 0;
      right: 0;
      display: grid;
      gap: 0.35rem;
      padding: 0.45rem;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      box-shadow: 0 18px 38px rgba(15, 23, 42, 0.12);
      z-index: 30;
    }

    .modern-toolbar__search-result {
      width: 100%;
      border: 0;
      background: transparent;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.6rem 0.65rem;
      border-radius: 10px;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.18s ease, transform 0.18s ease;
    }

    .modern-toolbar__search-result:hover {
      background: #f8fbff;
      transform: translateY(-1px);
    }

    .modern-toolbar__search-result-icon {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border-radius: 9px;
      background: #eff6ff;
      color: #3b82f6;
      flex: 0 0 auto;
    }

    .modern-toolbar__search-result-icon .mat-icon {
      width: 17px;
      height: 17px;
      font-size: 17px;
    }

    .modern-toolbar__search-result-copy {
      display: grid;
      min-width: 0;
      gap: 0.05rem;
    }

    .modern-toolbar__search-result-copy strong {
      color: #0f172a;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .modern-toolbar__search-result-copy small {
      color: #64748b;
      font-size: 0.68rem;
      font-weight: 500;
      line-height: 1.2;
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

      .modern-toolbar__search-shell {
        grid-area: search;
        justify-self: stretch;
        max-width: none;
      }

      .modern-toolbar__actions {
        grid-area: actions;
        align-self: start;
      }
    }

    @media (max-width: 768px) {
      .modern-toolbar {
        gap: 0.8rem;
        padding: 0.75rem;
        grid-template-columns: 1fr;
        grid-template-areas:
          'brand'
          'context'
          'search'
          'actions';
      }

      .modern-toolbar__brand {
        padding: 0;
        min-width: 0;
      }

      .modern-toolbar__search-shell {
        width: 100%;
        max-width: none;
        justify-self: stretch;
      }

      .modern-toolbar__actions {
        width: 100%;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.45rem;
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
  private static readonly SEARCH_ENTRIES: ToolbarSearchEntry[] = [
    { label: 'Dashboard', description: 'Vista general del sistema', route: '/dashboard', icon: 'dashboard', keywords: ['inicio', 'panel', 'dashboard'] },
    { label: 'Cursos', description: 'Gestionar cursos y niveles', route: '/dashboard/cursos', icon: 'school', keywords: ['curso', 'cursos', 'nivel', 'niveles'] },
    { label: 'Nuevo curso', description: 'Crear un curso nuevo', route: '/dashboard/cursos/nuevo', icon: 'add_circle', keywords: ['crear curso', 'nuevo curso', 'agregar curso'] },
    { label: 'Matriculas', description: 'Listado de matriculas', route: '/dashboard/matriculas', icon: 'badge', keywords: ['matricula', 'matriculas', 'estudiantes'] },
    { label: 'Nueva matricula', description: 'Registrar una matricula nueva', route: '/dashboard/matriculas/nueva', icon: 'person_add', keywords: ['crear matricula', 'agregar matricula', 'nuevo estudiante'] },
    { label: 'Docentes', description: 'Gestionar docentes y asistentes', route: '/dashboard/profesores', icon: 'groups', keywords: ['docente', 'docentes', 'profesor', 'asistente'] },
    { label: 'Nuevo docente', description: 'Registrar docente', route: '/dashboard/profesores/nuevo', icon: 'person_add', keywords: ['crear docente', 'nuevo docente', 'profesor nuevo'] },
    { label: 'Nuevo asistente', description: 'Registrar asistente', route: '/dashboard/profesores/nuevo-asistente', icon: 'support_agent', keywords: ['crear asistente', 'nuevo asistente'] },
    { label: 'Horario', description: 'Horario semanal por curso', route: '/dashboard/horario', icon: 'calendar_view_week', keywords: ['horario', 'bloques', 'recreo'] },
    { label: 'Asignaturas', description: 'Gestionar asignaturas', route: '/dashboard/asignaturas', icon: 'menu_book', keywords: ['asignatura', 'asignaturas', 'materias'] },
    { label: 'Actividades', description: 'Calendario de actividades', route: '/dashboard/actividades', icon: 'event_note', keywords: ['actividad', 'actividades', 'calendario'] },
    { label: 'Contenido', description: 'Contenido pedagógico', route: '/dashboard/contenido', icon: 'folder', keywords: ['contenido', 'material', 'recursos'] },
    { label: 'Asistencia', description: 'Pase, resumen semanal y mensual', route: '/dashboard/asistencia', icon: 'fact_check', keywords: ['asistencia', 'pase', 'resumen semanal', 'resumen mensual'] },
    { label: 'Evaluaciones', description: 'Libro de notas e informes', route: '/dashboard/calificaciones', icon: 'grading', keywords: ['evaluaciones', 'calificaciones', 'notas', 'ficha estudiante', 'informe de notas'] },
    { label: 'Planificacion', description: 'Vista general de planificacion', route: '/dashboard/planificacion', icon: 'edit_calendar', keywords: ['planificacion', 'planificar'] },
    { label: 'Nueva unidad', description: 'Crear unidad de planificacion', route: '/dashboard/planificacion/nueva-unidad', icon: 'library_add', keywords: ['unidad', 'nueva unidad', 'crear unidad'] },
    { label: 'Nueva clase', description: 'Crear clase de planificacion', route: '/dashboard/planificaciones-nuevo/nueva-clase', icon: 'note_add', keywords: ['clase', 'nueva clase', 'crear clase'] },
    { label: 'Documentos', description: 'Documentos de planificacion', route: '/dashboard/planificacion/documentos', icon: 'description', keywords: ['documento', 'documentos', 'archivos'] },
    { label: 'Planificaciones nuevo', description: 'Modulo nuevo de planificaciones', route: '/dashboard/planificaciones-nuevo', icon: 'inventory_2', keywords: ['planificaciones nuevo', 'nuevo planificaciones'] },
    { label: 'Administracion', description: 'Panel de administracion', route: '/dashboard/administracion', icon: 'admin_panel_settings', keywords: ['administracion', 'admin'] },
    { label: 'Usuarios', description: 'Gestionar usuarios', route: '/dashboard/administracion/usuarios', icon: 'manage_accounts', keywords: ['usuario', 'usuarios'] },
    { label: 'Roles', description: 'Gestionar roles', route: '/dashboard/administracion/roles', icon: 'security', keywords: ['rol', 'roles', 'permisos'] },
    { label: 'Matriz de acceso', description: 'Permisos por modulo', route: '/dashboard/administracion/matriz-acceso', icon: 'grid_view', keywords: ['matriz acceso', 'acceso', 'permisos'] },
    { label: 'Nuevo usuario', description: 'Registrar usuario nuevo', route: '/dashboard/administracion/nuevo-usuario', icon: 'person_add', keywords: ['crear usuario', 'nuevo usuario'] },
    { label: 'Auditoria', description: 'Registro de auditoria', route: '/dashboard/administracion/auditoria', icon: 'history', keywords: ['auditoria', 'logs', 'registro'] }
  ];

  private static readonly STUDENT_SEARCH_ENTRIES: ToolbarSearchEntry[] = [
    { label: 'Dashboard', description: 'Resumen general del estudiante', route: '/alumno', icon: 'space_dashboard', keywords: ['inicio', 'dashboard', 'resumen'] },
    { label: 'Asignaturas', description: 'Tus asignaturas activas', route: '/alumno/asignaturas', icon: 'library_books', keywords: ['asignaturas', 'materias', 'ramos'] },
    { label: 'Horario', description: 'Horario semanal del estudiante', route: '/alumno/horario', icon: 'schedule', keywords: ['horario', 'bloques', 'clases'] },
    { label: 'Evaluaciones', description: 'Notas y evaluaciones', route: '/alumno/calificaciones', icon: 'grading', keywords: ['evaluaciones', 'notas', 'calificaciones'] },
    { label: 'Asistencia', description: 'Resumen de asistencia', route: '/alumno/asistencia', icon: 'fact_check', keywords: ['asistencia', 'inasistencias', 'atrasos'] },
    { label: 'Actividades', description: 'Actividades y calendario', route: '/alumno/actividades', icon: 'event', keywords: ['actividades', 'calendario', 'eventos'] }
  ];

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
  protected readonly searchOpen = signal(false);
  protected readonly searchResults = computed(() => this.buildSearchResults(this.searchValue()));
  protected readonly showSearchResults = computed(() => this.searchOpen() && this.searchResults().length > 0);

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

  protected get shortUserName(): string {
    const parts = this.resolvedUserName.split(' ').filter(Boolean);
    if (parts.length <= 1) {
      return this.resolvedUserName;
    }
    if (parts.length === 2) {
      return `${parts[0]} ${parts[1]}`;
    }

    return `${parts[0]} ${parts[parts.length - 2]}`;
  }

  protected updateSearchValue(value: string): void {
    this.searchValue.set(value);
    this.searchOpen.set(value.trim().length > 0);
  }

  protected openSearchResults(): void {
    this.searchOpen.set(this.searchValue().trim().length > 0);
  }

  protected closeSearchResultsSoon(): void {
    window.setTimeout(() => this.searchOpen.set(false), 120);
  }

  protected handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.searchOpen.set(false);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const firstResult = this.searchResults()[0];
      if (firstResult) {
        this.navigateToSearchResult(firstResult);
      }
    }
  }

  protected navigateToSearchResult(result: ToolbarSearchEntry): void {
    this.searchOpen.set(false);
    this.searchValue.set('');
    void this.router.navigateByUrl(result.route);
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

  private buildSearchResults(rawValue: string): ToolbarSearchEntry[] {
    const query = this.normalizeSearchValue(rawValue);
    if (!query) {
      return [];
    }

    const queryTerms = query.split(' ').filter(Boolean);
    const entries =
      this.resolvedUserRole.toUpperCase() === 'STUDENT'
        ? TeacherModernToolbarComponent.STUDENT_SEARCH_ENTRIES
        : TeacherModernToolbarComponent.SEARCH_ENTRIES;

    return entries
      .map((entry) => {
        const haystack = this.normalizeSearchValue([
          entry.label,
          entry.description,
          ...entry.keywords
        ].join(' '));

        let score = 0;
        if (this.normalizeSearchValue(entry.label).startsWith(query)) {
          score += 6;
        }
        if (haystack.includes(query)) {
          score += 4;
        }
        score += queryTerms.filter((term) => haystack.includes(term)).length;

        return { entry, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.entry.label.localeCompare(right.entry.label))
      .slice(0, 8)
      .map((item) => item.entry);
  }

  private normalizeSearchValue(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
