import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserModuleAccessService } from '../services/user-module-access.service';

export const moduleAccessGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const userModuleAccessService = inject(UserModuleAccessService);
  const moduleCode = route.data?.['moduleCode'] as string | undefined;
  const role = authService.getUserRole();

  if (!moduleCode || role === 'STUDENT') {
    return true;
  }

  return userModuleAccessService.getAccessView().pipe(
    map((view) => {
      if (userModuleAccessService.hasAccess(moduleCode, view)) {
        return true;
      }

      return router.createUrlTree([userModuleAccessService.resolveFallbackRoute(view, role)]);
    }),
    catchError(() => of(router.createUrlTree([authService.getDefaultRoute()])))
  );
};
