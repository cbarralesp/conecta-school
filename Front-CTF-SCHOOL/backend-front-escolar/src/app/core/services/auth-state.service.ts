import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, AuthUser } from '../models/auth.models';

const TOKEN_KEY = 'school_auth_token';
const USER_KEY = 'school_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<AuthUser | null>(null);

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  restoreSession(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);

    this.tokenSignal.set(token);
    this.userSignal.set(user ? this.normalizeStoredUser(JSON.parse(user) as Partial<AuthUser>) : null);
  }

  setSession(response: AuthResponse): void {
    const user = this.normalizeStoredUser(response.user);
    const token = response.token || response.accessToken;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    this.tokenSignal.set(token);
    this.userSignal.set(user);
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  private normalizeStoredUser(user: Partial<AuthUser>): AuthUser {
    return {
      id: user.id ?? 0,
      nombre: user.nombre ?? user.username ?? 'Usuario',
      email: user.email ?? '',
      username: user.username ?? '',
      rol: user.rol ?? 'TEACHER',
      roleCode: user.roleCode ?? user.rol ?? 'PROFESOR',
      roles: user.roles ?? []
    };
  }
}
