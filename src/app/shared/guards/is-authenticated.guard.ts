import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

export const isAuthenticatedGuard: CanActivateFn = (route, state) => {

  const authService = inject( AuthService );

  if( !authService.isAuthenticated() ) {
    return false;
  }

  return true;
};
