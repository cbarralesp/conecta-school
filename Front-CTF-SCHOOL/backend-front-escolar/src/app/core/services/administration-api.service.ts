import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import {
  AdministrationAccessLevel,
  AdministrationAccessMatrix,
  AdministrationAccessMatrixSavePayload,
  AdministrationAuditLogItem,
  AdministrationAuditLogView,
  AdministrationAuditType,
  AdministrationPermissionBullet,
  AdministrationRoleCard,
  AdministrationRoleCode,
  AdministrationRoleOption,
  AdministrationRolesOverview,
  AdministrationUserDetail,
  AdministrationUserFormValue,
  AdministrationUserListItem,
  AdministrationUserStatus,
  AdministrationUsersOverview
} from '../models/administration.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

const CANONICAL_MODULE_ORDER = [
  'DASHBOARD',
  'MATRICULAS',
  'PROFESORES',
  'CURSOS',
  'HORARIO',
  'ASIGNATURAS',
  'ASISTENCIA',
  'CALIFICACIONES',
  'ACTIVIDADES',
  'CONTENIDO',
  'PLANIFICACIONES',
  'PLANIFICACION',
  'USUARIOS',
  'ROLES',
  'MATRIZ_ACCESO',
  'AUDITORIA'
] as const;

const CANONICAL_MODULE_NAME_BY_CODE: Record<string, string> = {
  DASHBOARD: 'Dashboard',
  MATRICULAS: 'Matrículas',
  PROFESORES: 'Docentes',
  CURSOS: 'Cursos',
  HORARIO: 'Horario',
  ASIGNATURAS: 'Asignaturas',
  ASISTENCIA: 'Asistencia',
  CALIFICACIONES: 'Evaluaciones',
  ACTIVIDADES: 'Actividades',
  CONTENIDO: 'Contenido',
  PLANIFICACIONES: 'Planificaciones',
  PLANIFICACION: 'Planificación',
  USUARIOS: 'Usuarios',
  ROLES: 'Roles',
  MATRIZ_ACCESO: 'Matriz de acceso',
  AUDITORIA: 'Auditoría'
};

const BASE_ROLE_OPTIONS: AdministrationRoleOption[] = [
  { code: 'SUPERADMIN', name: 'Superadmin', description: 'Administración total del sistema.' },
  { code: 'DIRECTOR', name: 'Director', description: 'Gestión institucional y supervisión general.' },
  { code: 'INSPECTOR', name: 'Inspector', description: 'Supervisión disciplinaria y asistencia.' },
  { code: 'PROFESOR', name: 'Profesor', description: 'Gestión docente y académica.' },
  { code: 'ASISTENTE', name: 'Asistente', description: 'Apoyo administrativo y operativo.' },
  { code: 'SECRETARIA', name: 'Secretaria', description: 'Apoyo administrativo y operativo.' },
  { code: 'APODERADO', name: 'Apoderado', description: 'Seguimiento de alumnos asociados.' },
  { code: 'ALUMNO', name: 'Alumno', description: 'Acceso al portal estudiantil.' }
];

type UserFilter = {
  search?: string;
  roleCode?: AdministrationRoleCode | '';
  status?: AdministrationUserStatus | '';
};

type AuditFilter = {
  type?: AdministrationAuditType | '';
  user?: string;
  dateStart?: string | Date | null;
  dateEnd?: string | Date | null;
};

@Injectable({ providedIn: 'root' })
export class AdministrationApiService {
  private readonly http = inject(HttpClient);

  getUsersOverview(filters?: UserFilter): Observable<AdministrationUsersOverview> {
    let params = new HttpParams();
    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters?.roleCode) {
      params = params.set('roleCode', filters.roleCode);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<AdministrationUsersOverview>(`${API_CONFIG.baseUrl}/admin/users`, { params }).pipe(
      map((overview) => this.normalizeUsersOverview(overview))
    );
  }

  getUserById(userId: number): Observable<AdministrationUserDetail | null> {
    return this.http.get<AdministrationUserDetail>(`${API_CONFIG.baseUrl}/admin/users/${userId}`).pipe(
      map((user) => this.normalizeUserDetail(user))
    );
  }

  createUser(payload: AdministrationUserFormValue): Observable<AdministrationUserDetail> {
    return this.http.post<AdministrationUserDetail>(`${API_CONFIG.baseUrl}/admin/users`, payload).pipe(
      map((user) => this.normalizeUserDetail(user))
    );
  }

  updateUser(userId: number, payload: AdministrationUserFormValue): Observable<AdministrationUserDetail> {
    return this.http.put<AdministrationUserDetail>(`${API_CONFIG.baseUrl}/admin/users/${userId}`, payload).pipe(
      map((user) => this.normalizeUserDetail(user))
    );
  }

  blockUser(userId: number): Observable<void> {
    return this.http.patch<void>(`${API_CONFIG.baseUrl}/admin/users/${userId}/block`, {});
  }

  unblockUser(userId: number): Observable<void> {
    return this.http.patch<void>(`${API_CONFIG.baseUrl}/admin/users/${userId}/unblock`, {});
  }

  setActiveState(userId: number, active: boolean): Observable<void> {
    const params = new HttpParams().set('value', active);
    return this.http.patch<void>(`${API_CONFIG.baseUrl}/admin/users/${userId}/active`, {}, { params });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${API_CONFIG.baseUrl}/admin/users/${userId}`);
  }

  getRolesOverview(): Observable<AdministrationRolesOverview> {
    return this.http.get<AdministrationRolesOverview>(`${API_CONFIG.baseUrl}/admin/roles`).pipe(
      map((overview) => ({
        roles: overview.roles.map((role) => this.normalizeRoleCard(role))
      }))
    );
  }

  getRoleOptions(): Observable<AdministrationRoleOption[]> {
    return this.http.get<AdministrationRoleOption[]>(`${API_CONFIG.baseUrl}/admin/roles/options`).pipe(
      map((roles) => this.mergeRoleOptions(roles.map((role) => this.normalizeRoleOption(role))))
    );
  }

  getAccessMatrix(): Observable<AdministrationAccessMatrix> {
    return this.http.get<AdministrationAccessMatrix>(`${API_CONFIG.baseUrl}/admin/access-matrix`).pipe(
      map((matrix) => ({
        roles: this.mergeRoleOptions(matrix.roles.map((role) => this.normalizeRoleOption(role))),
        rows: this.normalizeAccessMatrixRows(matrix),
        userOverrides: (matrix.userOverrides ?? [])
          .map((override) => ({
            ...override,
            moduleCode: this.normalizeModuleCode(override.moduleCode)
          }))
          .filter((override) => this.isSupportedModule(override.moduleCode))
      }))
    );
  }

  saveAccessMatrix(payload: AdministrationAccessMatrixSavePayload): Observable<void> {
    return this.http.put<void>(`${API_CONFIG.baseUrl}/admin/access-matrix`, {
      rows: payload.rows.map((row) => ({
        ...row,
        moduleCode: this.normalizeModuleCode(row.moduleCode),
        moduleName: this.moduleDisplayName(row.moduleCode, row.moduleName)
      })),
      userOverrides: payload.userOverrides.map((override) => ({
        ...override,
        moduleCode: this.normalizeModuleCode(override.moduleCode)
      }))
    });
  }

  getAuditLogs(filters?: AuditFilter): Observable<AdministrationAuditLogView> {
    let params = new HttpParams();
    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.user?.trim()) {
      params = params.set('user', filters.user.trim());
    }
    const normalizedDateStart = this.normalizeDateFilter(filters?.dateStart);
    const normalizedDateEnd = this.normalizeDateFilter(filters?.dateEnd);
    if (normalizedDateStart) {
      params = params.set('dateStart', normalizedDateStart);
    }
    if (normalizedDateEnd) {
      params = params.set('dateEnd', normalizedDateEnd);
    }

    return this.http.get<AdministrationAuditLogView>(`${API_CONFIG.baseUrl}/admin/audit-logs`, { params }).pipe(
      map((view) => ({
        actionOptions: view.actionOptions.map((option) => ({
          value: option.value,
          label: normalizeDashboardText(option.label)
        })),
        userOptions: [
          { value: '', label: 'Todos los usuarios' },
          ...view.userOptions
            .filter((option) => option.value)
            .map((option) => ({
              value: option.value,
              label: normalizeDashboardText(option.label)
            }))
        ],
        items: view.items.map((item) => this.normalizeAuditItem(item))
      }))
    );
  }

  exportAuditLogs(filters?: AuditFilter): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.user?.trim()) {
      params = params.set('user', filters.user.trim());
    }
    const normalizedDateStart = this.normalizeDateFilter(filters?.dateStart);
    const normalizedDateEnd = this.normalizeDateFilter(filters?.dateEnd);
    if (normalizedDateStart) {
      params = params.set('dateStart', normalizedDateStart);
    }
    if (normalizedDateEnd) {
      params = params.set('dateEnd', normalizedDateEnd);
    }

    return this.http.get(`${API_CONFIG.baseUrl}/admin/audit-logs/export`, {
      params,
      responseType: 'blob'
    });
  }

  private normalizeUsersOverview(overview: AdministrationUsersOverview): AdministrationUsersOverview {
    return {
      summary: overview.summary.map((metric) => ({
        ...metric,
        label: normalizeDashboardText(metric.label)
      })),
      roles: overview.roles.map((role) => this.normalizeRoleOption(role)),
      users: overview.users.map((user) => this.normalizeUserListItem(user))
    };
  }

  private normalizeUserListItem(user: AdministrationUserListItem): AdministrationUserListItem {
    return {
      ...user,
      username: normalizeDashboardText(user.username),
      fullName: normalizeDashboardText(user.fullName),
      email: normalizeDashboardText(user.email),
      run: normalizeDashboardText(user.run),
      phone: normalizeDashboardText(user.phone),
      roleCode: user.roleCode,
      roleName: normalizeDashboardText(user.roleName),
      lastAccessLabel: normalizeDashboardText(user.lastAccessLabel),
      status: normalizeDashboardText(user.status) as AdministrationUserStatus
    };
  }

  private normalizeUserDetail(user: AdministrationUserDetail): AdministrationUserDetail {
    return {
      ...this.normalizeUserListItem(user),
      firstName: normalizeDashboardText(user.firstName),
      paternalLastName: normalizeDashboardText(user.paternalLastName),
      maternalLastName: normalizeDashboardText(user.maternalLastName),
      roleDescription: normalizeDashboardText(user.roleDescription),
      forcePasswordChange: user.forcePasswordChange,
      twoFactorRequired: user.twoFactorRequired,
      accountExpiresAt: user.accountExpiresAt
    };
  }

  private normalizeRoleOption(role: AdministrationRoleOption): AdministrationRoleOption {
    return {
      code: role.code,
      name: normalizeDashboardText(role.name),
      description: normalizeDashboardText(role.description)
    };
  }

  private normalizeRoleCard(role: AdministrationRoleCard): AdministrationRoleCard {
    return {
      ...role,
      name: normalizeDashboardText(role.name),
      description: normalizeDashboardText(role.description),
      levelLabel: normalizeDashboardText(role.levelLabel),
      scopeSummary: normalizeDashboardText(role.scopeSummary),
      permissions: role.permissions.map((permission) => this.normalizePermission(permission))
    };
  }

  private normalizePermission(permission: AdministrationPermissionBullet): AdministrationPermissionBullet {
    return {
      ...permission,
      label: normalizeDashboardText(permission.label)
    };
  }

  private normalizeAccessMatrixRows(matrix: AdministrationAccessMatrix): AdministrationAccessMatrix['rows'] {
    const roles = this.mergeRoleOptions(matrix.roles.map((role) => this.normalizeRoleOption(role)));
    const merged = new Map<string, AdministrationAccessMatrix['rows'][number]>();

    for (const rawRow of matrix.rows) {
      const normalizedCode = this.normalizeModuleCode(rawRow.moduleCode);
      if (!this.isSupportedModule(normalizedCode)) {
        continue;
      }

      const moduleName = this.moduleDisplayName(normalizedCode, rawRow.moduleName);
      const normalizedKey = normalizedCode;
      const existing = merged.get(normalizedKey);

      if (!existing) {
        const basePermissions = Object.fromEntries(
          roles.map((role) => [role.code, this.defaultAccessForRole(role.code)])
        ) as Record<AdministrationRoleCode, AdministrationAccessLevel>;
        merged.set(normalizedKey, {
          moduleCode: normalizedCode,
          moduleName,
        permissions: { ...basePermissions, ...rawRow.permissions }
      });
      continue;
      }

      const nextPermissions = { ...existing.permissions };
      for (const role of roles) {
        nextPermissions[role.code] = this.pickHigherAccess(
          nextPermissions[role.code] ?? 'NONE',
          rawRow.permissions[role.code] ?? 'NONE'
        );
      }

      merged.set(normalizedKey, {
        ...existing,
        moduleCode: normalizedCode,
        moduleName,
        permissions: nextPermissions
      });
    }

    for (const moduleCode of CANONICAL_MODULE_ORDER) {
      if (merged.has(moduleCode)) {
        continue;
      }

      merged.set(moduleCode, {
        moduleCode,
        moduleName: this.moduleDisplayName(moduleCode, moduleCode),
        permissions: Object.fromEntries(
          roles.map((role) => [role.code, this.defaultAccessForRole(role.code)])
        ) as Record<AdministrationRoleCode, AdministrationAccessLevel>
      });
    }

    return Array.from(merged.values()).sort((left, right) => this.moduleOrder(left.moduleCode) - this.moduleOrder(right.moduleCode));
  }

  private normalizeModuleCode(value: string): string {
    const normalized = normalizeDashboardText(value)
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .trim();

    switch (normalized) {
      case 'EVALUACIONES':
        return 'CALIFICACIONES';
      case 'DOCENTES':
        return 'PROFESORES';
      case 'MATRIZ_DE_ACCESO':
        return 'MATRIZ_ACCESO';
      default:
        return normalized;
    }
  }

  private moduleDisplayName(moduleCode: string, fallbackName: string): string {
    return CANONICAL_MODULE_NAME_BY_CODE[this.normalizeModuleCode(moduleCode)] ?? normalizeDashboardText(fallbackName);
  }

  private isSupportedModule(moduleCode: string): boolean {
    return CANONICAL_MODULE_ORDER.includes(this.normalizeModuleCode(moduleCode) as typeof CANONICAL_MODULE_ORDER[number]);
  }

  private moduleOrder(moduleCode: string): number {
    const normalized = this.normalizeModuleCode(moduleCode);
    const index = CANONICAL_MODULE_ORDER.indexOf(normalized as typeof CANONICAL_MODULE_ORDER[number]);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  private pickHigherAccess(
    left: AdministrationAccessLevel,
    right: AdministrationAccessLevel
  ): AdministrationAccessLevel {
    const priority: Record<AdministrationAccessLevel, number> = {
      NONE: 0,
      READ_ONLY: 1,
      PARTIAL: 2,
      FULL: 3
    };

    return priority[right] > priority[left] ? right : left;
  }

  private defaultAccessForRole(roleCode: AdministrationRoleCode): AdministrationAccessLevel {
    return roleCode === 'SUPERADMIN' || roleCode === 'DIRECTOR' ? 'FULL' : 'NONE';
  }

  private normalizeAuditItem(item: AdministrationAuditLogItem): AdministrationAuditLogItem {
    return {
      ...item,
      occurredLabel: normalizeDashboardText(item.occurredLabel),
      userDisplay: normalizeDashboardText(item.userDisplay),
      roleName: normalizeDashboardText(item.roleName),
      actionLabel: normalizeDashboardText(item.actionLabel),
      context: normalizeDashboardText(item.context)
    };
  }

  private mergeRoleOptions(roles: AdministrationRoleOption[]): AdministrationRoleOption[] {
    const merged = new Map<AdministrationRoleCode, AdministrationRoleOption>();
    BASE_ROLE_OPTIONS.forEach((role) => merged.set(role.code, role));
    roles.forEach((role) => merged.set(role.code, role));
    return Array.from(merged.values());
  }

  private normalizeDateFilter(value: string | Date | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${value.getFullYear()}-${month}-${day}`;
    }

    return value;
  }
}
