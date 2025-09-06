import { inject } from '@angular/core';
import { UrlTree } from '@angular/router';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable } from 'rxjs';

export const saveCurrentPageGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree>
| Promise<boolean | UrlTree>
| boolean
| UrlTree => {
  const router = inject(Router);

  const routeUrl = state.url;

  // console.log({routeUrl});

  // if( routeUrl == '/404' ) {
  //   localStorage.setItem('currentPage', routeUrl);
  //   return true;
  // }

  localStorage.setItem('currentPage', routeUrl);

  return true;
};
