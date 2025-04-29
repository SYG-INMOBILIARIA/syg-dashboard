import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { validate as ISUUID } from 'uuid';

import { AppState } from '../../app.config';
import { Observable, map } from 'rxjs';
import { AuthState } from '@redux/reducers/auth.reducer';

export const verifyRoleMenuAllowedGuard: CanActivateFn = (route, state) : Observable<boolean | UrlTree>
| Promise<boolean | UrlTree>
| boolean
| UrlTree => {

  const routeUrl = state.url;

  const store = inject( Store<AppState> );
  const router = inject( Router );

  return store.select('auth')
        .pipe(
          map( ( state: AuthState ) => {

            const { webUrlPermissionMethods } = state;

            const profilePattern = new RegExp("\/dashboard\/profile*", "i");

            if( ["/", "/#", "/dashboard", "/dashboard/home"].includes( routeUrl ) || profilePattern.test(routeUrl) ) return true;

            const webUrlsegments = routeUrl.split('/')
                            .map( (segment) => {
                              if( ISUUID(segment) ) return ':id';
                              return segment;
                            }).join('/');

            const isAllowed = webUrlPermissionMethods.some( (allow) => allow.webUrl == webUrlsegments );

            console.log({webUrlsegments, isAllowed, webUrlPermissionMethods});

            if( !isAllowed ) router.navigateByUrl('/401');

            return isAllowed;

          })
        )

};
