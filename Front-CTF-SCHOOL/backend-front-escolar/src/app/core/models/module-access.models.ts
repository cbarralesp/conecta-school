export type UserModuleAccessLevel = 'FULL' | 'READ_ONLY' | 'PARTIAL' | 'NONE';

export interface UserModuleAccessItem {
  moduleCode: string;
  moduleName: string;
  accessLevel: UserModuleAccessLevel;
}

export interface UserModuleAccessView {
  roleCode: string;
  modules: UserModuleAccessItem[];
}
