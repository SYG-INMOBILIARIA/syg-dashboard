import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable, map } from 'rxjs';
import { ListUserResponse, User, UserBody } from '../interfaces';
import { ValidationErrors } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getUsers( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListUserResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListUserResponse>(`${ this._baseUrl }/user?${ queryParams }`);
  }

  getUserById( id: string ): Observable<User> {
    return this._http.get<User>(`${ this._baseUrl }/user/${ id }`);
  }

  createUser( body: UserBody ): Observable<User> {
    return this._http.post<User>(`${ this._baseUrl }/user`, body );
  }

  updateUser( id: string, body: UserBody ): Observable<User> {
    return this._http.patch<User>(`${ this._baseUrl }/user/${ id }`, body );
  }

  removeUser( id: string ): Observable<User> {
    return this._http.delete<User>(`${ this._baseUrl }/user/${ id }` );
  }

  getUserlreadyExists( email: string, identityNumber: string, id?: string ): Observable<{alreadyEmail: boolean, alreadyIdentityNumber: boolean}> {

    const body = { email, identityNumber, id };

    return this._http.post<{alreadyEmail: boolean, alreadyIdentityNumber: boolean}>(`${ this._baseUrl }/user/already-exists/`, body)
      // .pipe(
      //   map( ({alreadyExists}) => {
      //     return alreadyExists ? { alreadyexists: true } : null;
      //   } )
      // );
  }

}
