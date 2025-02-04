import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, of, tap } from 'rxjs';

import { environments } from '@envs/environments';
import { AuthStatus } from '../enums';
import { AuthResponse, RoleMenuPermission, UserAuthenticated } from '../interfaces';
// import { PersonSession, SinginResponse, TokenResponse } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );
  private _router = inject( Router );

  private _authStatus = signal<AuthStatus>( AuthStatus.checking );
  private _personSession = signal<any | null>( null );

  public readonly authStatus = computed<AuthStatus>(
    () => this._authStatus()
  );

  public readonly isAuthenticated = computed<boolean>(
    () => this._authStatus() == AuthStatus.authenticated
  );

  public readonly personSession = computed<any | null>(
    () => this._personSession()
  );

  constructor() {
    console.log('onAuthToken :::');
    this.onAuthToken().subscribe();

    // FIXME: Load menu by roles user
    this.loadMenuAloweedByRoles().subscribe();

  }

  onSingin( username: string, password: string ): Observable<boolean> {

    return this._http.post<AuthResponse>( `${ this._baseUrl }/auth/singin`, { username, password  } )
      .pipe(
        tap( ({ userAuthenticated, token }) => this._onSaveSessionInStorage(userAuthenticated, token) ),
        tap(() => {
          this._router.navigateByUrl('/dashboard');
        }),
        map(() => true )
      );

  }

  onAuthToken(): Observable<boolean> {

    const token = localStorage.getItem('token');

    if( !token || token == '' ) {
      this._authStatus.set( AuthStatus.noAuthenticated );
      this._personSession.set( null );
      return of( false );
    }

    return this._http.post<any>( `${ this._baseUrl }/auth/token`, {} )
      .pipe(
        tap( ({ data, token }) => this._onSaveSessionInStorage(data, token) ),
        map( () => true )
      );

  }

  private _onSaveSessionInStorage( personSession: UserAuthenticated, token: string ) {
    localStorage.setItem('token', token);
    this._authStatus.set( AuthStatus.authenticated );
    this._personSession.set( personSession );
  }

  onSingOut() {
    this._authStatus.set( AuthStatus.noAuthenticated );
    this._personSession.set( null );
    localStorage.removeItem('token');
    this._router.navigateByUrl('/auth');
  }

  loadMenuAloweedByRoles() {
    return this._http.get<RoleMenuPermission>( `${ this._baseUrl }/role-menu-permission/by-roles-user` )
      .pipe(
        map( ({ permissions }) => {

          const childrenLevel3 = permissions.filter( (children) => children.menu.level == 3 && children.menu.parentId );
          const childrenLevel2 = permissions.filter( (children) => children.menu.level == 2 && children.menu.parentId );
          const childrenLevel1 = permissions.filter( (children) => children.menu.level == 1 && children.menu.parentId );

          const parentLevel1 = permissions.filter( (e) => e.menu.level == 1 && !e.menu.parentId );
          const parentLevel2 = permissions.filter( (e) => e.menu.level == 2 && !e.menu.parentId );

          const parentAndChildren2 = parentLevel2.map( (parent) => {
            parent.children = childrenLevel3.filter( (children) => children.menu.parentId === parent.menu.id );
            return parent;
          } );

          const newMenus = parentLevel1.map( (parent) => {

            parent.children = [...childrenLevel2.filter( (children) => children.menu.parentId == parent.menu.id )];
            parent.children = [...parent.children, ...parentAndChildren2.filter( (s) => s.menu.parentId == parent.menu.id ) ];
            parent.children = [...parent.children, ...childrenLevel1.filter( (s) => s.menu.parentId == parent.menu.id ) ];

            return parent;
          } );

          return newMenus;
        }),
        tap( (response) => {
          console.log({response});
        }),
      );
  }

}
