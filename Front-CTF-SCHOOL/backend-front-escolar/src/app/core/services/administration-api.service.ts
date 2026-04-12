import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import {
  AdministrationAccessMatrix,
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

type UserFilter = {
  search?: string;
  roleCode?: AdministrationRoleCode | '';
  status?: AdministrationUserStatus | '';
};

type AuditFilter = {
  type?: AdministrationAuditType | '';
  user?: string;
  date?: string | Date | null;
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
      map((roles) => roles.map((role) => this.normalizeRoleOption(role)))
    );
  }

  getAccessMatrix(): Observable<AdministrationAccessMatrix> {
    return this.http.get<AdministrationAccessMatrix>(`${API_CONFIG.baseUrl}/admin/access-matrix`).pipe(
      map((matrix) => ({
        roles: matrix.roles.map((role) => this.normalizeRoleOption(role)),
        rows: matrix.rows.map((row) => ({
          ...row,
          moduleName: normalizeDashboardText(row.moduleName)
        }))
      }))
    );
  }

  getAuditLogs(filters?: AuditFilter): Observable<AdministrationAuditLogView> {
    let params = new HttpParams();
    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.user?.trim()) {
      params = params.set('user', filters.user.trim());
    }
    const normalizedDate = this.normalizeDateFilter(filters?.date);
    if (normalizedDate) {
      params = params.set('date', normalizedDate);
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
    const normalizedDate = this.normalizeDateFilter(filters?.date);
    if (normalizedDate) {
      params = params.set('date', normalizedDate);
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

  private normalizeAuditItem(item: AdministrationAuditLogItem): AdministrationAuditLogItem {
    return {
      ...item,
      occurredLabel: normalizeDashboardText(item.occurredLabel),
      userDisplay: normalizeDashboardText(item.userDisplay),
      actionLabel: normalizeDashboardText(item.actionLabel),
      context: normalizeDashboardText(item.context)
    };
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
