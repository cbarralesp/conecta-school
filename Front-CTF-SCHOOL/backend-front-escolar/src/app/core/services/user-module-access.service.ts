import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { AuthStateService } from './auth-state.service';
import { AuthApiService } from './auth-api.service';
import { UserModuleAccessItem, UserModuleAccessLevel, UserModuleAccessView } from '../models/module-access.models';
import { ApplicationRole } from '../models/auth.models';

const MODULE_ROUTE_BY_CODE: Record<string, string> = {
  DASHBOARD: '/dashboard',
  MATRICULAS: '/dashboard/matriculas',
  PROFESORES: '/dashboard/profesores',
  CURSOS: '/dashboard/cursos',
  ASIGNATURAS: '/dashboard/asignaturas',
  HORARIO: '/dashboard/horario',
  ASISTENCIA: '/dashboard/asistencia',
  CALIFICACIONES: '/dashboard/calificaciónes',
  ACTIVIDADES: '/dashboard/actividades',
  CONTENIDO: '/dashboard/contenido',
  PLANIFICACIONES: '/dashboard/planificaciones-nuevo',
  USUARIOS: '/dashboard/administracion/usuarios',
  ROLES: '/dashboard/administracion/roles',
  MATRIZ_ACCESO: '/dashboard/administracion/matriz-acceso',
  AUDITORIA: '/dashboard/administracion/auditoria'
};

@Injectable({ providedIn: 'root' })
export class UserModuleAccessService {
  private readonly authApiService = inject(AuthApiService);
  private readonly authStateService = inject(AuthStateService);

  private accessViewRequest$: Observable<UserModuleAccessView> | null = null;

  getAccessView(forceRefresh = false): Observable<UserModuleAccessView> {
    if (!this.accessViewRequest$ || forceRefresh) {
      this.accessViewRequest$ = this.authApiService.getCurrentModuleAccess().pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }

    return this.accessViewRequest$;
  }

  clearCache(): void {
    this.accessViewRequest$ = null;
  }

  hasAccess(moduleCode: string, view: UserModuleAccessView | null | undefined): boolean {
    const normalizedModuleCodes = this.normalizedModuleCandidates(moduleCode);

    if (!view) {
      return true;
    }

    const match = view.modules.find(
      (module) => normalizedModuleCodes.includes(this.normalizeModuleCode(module.moduleCode))
    );

    return !!match && match.accessLevel !== 'NONE';
  }

  visibleItems<T extends { moduleCode?: string }>(items: readonly T[], view: UserModuleAccessView | null | undefined): T[] {
    return items.filter((item) => !item.moduleCode || this.hasAccess(item.moduleCode, view));
  }

  resolveFallbackRoute(view: UserModuleAccessView | null | undefined, role: ApplicationRole | null): string {
    if (role === 'STUDENT') {
      return '/alumno';
    }

    if (!view) {
      return '/dashboard';
    }

    const firstAllowed = view.modules.find((module) => module.accessLevel !== 'NONE');
    if (firstAllowed) {
      return MODULE_ROUTE_BY_CODE[this.normalizeModuleCode(firstAllowed.moduleCode)] ?? '/dashboard';
    }

    return '/dashboard';
  }

  getModuleCodeForRoute(route: string): string | null {
    const normalizedRoute = route.trim();
    const match = Object.entries(MODULE_ROUTE_BY_CODE).find(([, value]) => value === normalizedRoute);
    return match?.[0] ?? null;
  }

  currentUserRoleCode(): string {
    return (this.authStateService.user()?.roleCode ?? 'PROFESOR').trim().toUpperCase();
  }

  getSafeAccessView(): Observable<UserModuleAccessView | null> {
    return this.getAccessView().pipe(
      map((view) => view),
      catchError(() => of(null))
    );
  }

  private normalizeModuleCode(value: string): string {
    const normalized = value.trim().toUpperCase();
    switch (normalized) {
      case 'EVALUACIONES':
        return 'CALIFICACIONES';
      case 'DOCENTES':
        return 'PROFESORES';
      case 'MATRIZ DE ACCESO':
        return 'MATRIZ_ACCESO';
      default:
        return normalized;
    }
  }

  private normalizedModuleCandidates(moduleCode: string): string[] {
    return [this.normalizeModuleCode(moduleCode)];
  }
}
