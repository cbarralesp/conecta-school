import { computed, inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, AuthUser, ApplicationRole, LoginRequest } from '../models/auth.models';
import { AuthApiService } from './auth-api.service';
import { AuthStateService } from './auth-state.service';
import { UserModuleAccessService } from './user-module-access.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApiService = inject(AuthApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly userModuleAccessService = inject(UserModuleAccessService);

  readonly user = this.authStateService.user;
  readonly token = this.authStateService.token;
  readonly isAuthenticated = this.authStateService.isAuthenticated;
  readonly userRole = computed(() => this.authStateService.user()?.rol ?? null);

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.authApiService.login(payload).pipe(
      tap((response) => {
        this.userModuleAccessService.clearCache();
        this.authStateService.setSession(response);
      })
    );
  }

  logout(): void {
    this.userModuleAccessService.clearCache();
    this.authStateService.clearSession();
  }

  restoreSession(): void {
    this.authStateService.restoreSession();
  }

  getToken(): string | null {
    return this.authStateService.token();
  }

  getUser(): AuthUser | null {
    return this.authStateService.user();
  }

  getUserRole(): ApplicationRole | null {
    return this.authStateService.user()?.rol ?? null;
  }

  hasAnyRole(roles: readonly ApplicationRole[]): boolean {
    const currentRole = this.getUserRole();
    return currentRole !== null && roles.includes(currentRole);
  }

  getDefaultRoute(): string {
    return this.getDefaultRouteForRole(this.getUserRole());
  }

  getDefaultRouteForRole(role: ApplicationRole | null): string {
    switch (role) {
      case 'STUDENT':
        return '/alumno';
      case 'TEACHER':
        return '/dashboard';
      case 'ADMIN':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  }
}
