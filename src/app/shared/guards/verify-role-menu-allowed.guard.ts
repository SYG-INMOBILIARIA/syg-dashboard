import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { validate as ISUUID } from 'uuid';

import { AppState } from '@app/app.config';
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

            const profilePattern = new RegExp("\/dashboard\/profile\/*", "i");

            const profileClientPattern = new RegExp("\/dashboard\/client-profile\/*", "i");

            const overviewClientPattern = new RegExp("\/dashboard\/overview-client\/*", "i");

            const isHaveProfileClientMenu = webUrlPermissionMethods.some( (allow) => allow.webUrl == '/dashboard/client-profile' );

            const isHaveOverviewClientMenu = webUrlPermissionMethods.some( (allow) => allow.webUrl == '/dashboard/overview-client' );

            const appMenuFefault = ["/", "/#", "/dashboard", "/dashboard/home"];

            if( appMenuFefault.includes( routeUrl ) || profilePattern.test(routeUrl) ) {
              return true;
            }
            const webUrlsegments = routeUrl.split('/')
                            .map( (segment) => {
                              if( ISUUID(segment) ) return ':id';
                              return segment;
                            }).join('/');

            // isHaveProfileClientMenu &&
            if(  profileClientPattern.test( webUrlsegments ) ) {
              return true;
            }

            // isHaveOverviewClientMenu &&
            if(  overviewClientPattern.test( webUrlsegments ) ) {
              console.log('Entró al overview client ::: 👈 ');
              return true;
            }

            const isAllowed = webUrlPermissionMethods.some( (allow) => allow.webUrl == webUrlsegments );

            console.log({webUrlsegments, isAllowed, webUrlPermissionMethods});

            if( !isAllowed ) router.navigateByUrl('/401');

            return isAllowed;

          })
        )

};
