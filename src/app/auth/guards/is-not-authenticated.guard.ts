import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const isNotAuthenticatedGuard: CanMatchFn = (route, segments) => {

  const router = inject( Router );
  const authService = inject( AuthService );

  if( authService.isAuthenticated() ) {
    router.navigateByUrl('/dashboard');
    return false;
  }

  return true;
};
