export type ApplicationRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface LoginRequest {
  email: string;
  password: string;
  username?: string;
}

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  username: string;
  rol: ApplicationRole;
  roleCode: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
