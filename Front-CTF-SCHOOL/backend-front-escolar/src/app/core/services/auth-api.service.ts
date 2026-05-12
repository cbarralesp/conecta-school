import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../constants/api.config';
import { AuthResponse, LoginRequest } from '../models/auth.models';
import { UserModuleAccessView } from '../models/module-access.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(payload: LoginRequest): Observable<AuthResponse> {
    const identifier = payload.username?.trim() || payload.email.trim();
    return this.http.post<AuthResponse>(`${API_CONFIG.baseUrl}/auth/login`, {
      email: identifier,
      username: identifier,
      password: payload.password
    });
  }

  getCurrentModuleAccess(): Observable<UserModuleAccessView> {
    return this.http.get<UserModuleAccessView>(`${API_CONFIG.baseUrl}/auth/module-access`);
  }
}
