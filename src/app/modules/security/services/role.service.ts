import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable, map } from 'rxjs';

import { ListRoleResponse, Role, RoleBody } from '../interfaces';
import { ValidationErrors } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getRoles( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListRoleResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListRoleResponse>(`${ this._baseUrl }/role?${ queryParams }`);
  }

  getRoleById( id: string ): Observable<Role> {
    return this._http.get<Role>(`${ this._baseUrl }/role/${ id }`);
  }

  getRoleAlreadyExists( code: string, id?: string ): Observable<ValidationErrors | null> {
    return this._http.get<{ alreadyExists: boolean }>(`${ this._baseUrl }/role/already-exists/${ code }?id=${id}`)
      .pipe(
        map( ({alreadyExists}) => {
          return alreadyExists ? { alreadyexists: true } : null;
        } )
      );
  }

  createRole( body: RoleBody ): Observable<Role> {
    return this._http.post<Role>(`${ this._baseUrl }/role`, body );
  }

  updateRole( id: string, body: RoleBody ): Observable<Role> {
    return this._http.patch<Role>(`${ this._baseUrl }/role/${ id }`, body );
  }

  removeRole( id: string ): Observable<Role> {
    return this._http.delete<Role>(`${ this._baseUrl }/role/${ id }` );
  }

}
