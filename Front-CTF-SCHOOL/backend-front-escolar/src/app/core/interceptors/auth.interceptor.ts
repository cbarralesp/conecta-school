import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStateService = inject(AuthStateService);
  const router = inject(Router);
  const token = authStateService.token();
  const isLoginRequest = req.url.includes('/auth/login');

  if (!token) {
    return next(req);
  }

  const request = isLoginRequest
    ? req
    : req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!isLoginRequest && error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        authStateService.clearSession();
        void router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
