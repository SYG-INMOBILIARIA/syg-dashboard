import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { ListPermissionsByRoleResponse, PermissionBody } from '../interfaces';
import { delay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getPermissionsByRoleId( roleId: string ) {
    return this._http.get<ListPermissionsByRoleResponse>(`${ this._baseUrl }/role-menu-permission/by-role/${ roleId }`)
      .pipe(
        delay(500)
      );
  }

  updatePermission( body: PermissionBody ) {
    return this._http.post( `${ this._baseUrl }/role-menu-permission`, body );
  }

}
