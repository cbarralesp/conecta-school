export type AdministrationRoleCode =
  | 'SUPERADMIN'
  | 'DIRECTOR'
  | 'INSPECTOR'
  | 'PROFESOR'
  | 'SECRETARIA'
  | 'APODERADO'
  | 'ALUMNO';

export type AdministrationUserStatus = 'Activo' | 'Bloqueado' | 'Inactivo' | 'Pendiente';

export type AdministrationAccessLevel = 'FULL' | 'READ_ONLY' | 'PARTIAL' | 'NONE';

export type AdministrationPermissionState = 'ALLOWED' | 'PARTIAL' | 'DENIED';

export type AdministrationAuditType =
  | 'LOGIN'
  | 'CREATE'
  | 'ROLE_CHANGE'
  | 'BLOCK'
  | 'FAILED_ATTEMPT'
  | 'LOGOUT';

export interface AdministrationMetric {
  label: string;
  value: number | string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

export interface AdministrationRoleOption {
  code: AdministrationRoleCode;
  name: string;
  description: string;
}

export interface AdministrationUserListItem {
  id: number;
  username: string;
  fullName: string;
  email: string;
  run: string;
  phone: string;
  roleCode: AdministrationRoleCode;
  roleName: string;
  lastAccessAt: string | null;
  lastAccessLabel: string;
  status: AdministrationUserStatus;
  canDelete: boolean;
}

export interface AdministrationUsersOverview {
  summary: AdministrationMetric[];
  roles: AdministrationRoleOption[];
  users: AdministrationUserListItem[];
}

export interface AdministrationPermissionBullet {
  label: string;
  state: AdministrationPermissionState;
}

export interface AdministrationRoleCard {
  code: AdministrationRoleCode;
  name: string;
  description: string;
  userCount: number;
  levelLabel: string;
  scopeSummary: string;
  permissions: AdministrationPermissionBullet[];
}

export interface AdministrationRolesOverview {
  roles: AdministrationRoleCard[];
}

export interface AdministrationAccessMatrixRow {
  moduleCode: string;
  moduleName: string;
  permissions: Record<AdministrationRoleCode, AdministrationAccessLevel>;
}

export interface AdministrationUserModuleOverride {
  userId: number;
  moduleCode: string;
  accessLevel: AdministrationAccessLevel;
}

export interface AdministrationAccessMatrix {
  roles: AdministrationRoleOption[];
  rows: AdministrationAccessMatrixRow[];
  userOverrides: AdministrationUserModuleOverride[];
}

export interface AdministrationAccessMatrixSavePayload {
  rows: AdministrationAccessMatrixRow[];
  userOverrides: AdministrationUserModuleOverride[];
}

export interface AdministrationAuditLogItem {
  id: number;
  occurredAt: string;
  occurredLabel: string;
  type: AdministrationAuditType;
  userDisplay: string;
  roleName: string;
  actionLabel: string;
  context: string;
}

export interface AdministrationAuditLogView {
  actionOptions: { value: string; label: string }[];
  userOptions: { value: string; label: string }[];
  items: AdministrationAuditLogItem[];
}

export interface AdministrationUserFormValue {
  username?: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  email: string;
  run: string;
  phone: string;
  initialStatus: AdministrationUserStatus;
  roleCode: AdministrationRoleCode;
  temporaryPassword: string;
  forcePasswordChange: boolean;
  twoFactorRequired: boolean;
  accountExpiresAt: string | null;
}

export interface AdministrationUserDetail extends AdministrationUserListItem {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  roleDescription: string;
  forcePasswordChange: boolean;
  twoFactorRequired: boolean;
  accountExpiresAt: string | null;
}
