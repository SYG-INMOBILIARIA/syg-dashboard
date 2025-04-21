import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable } from 'rxjs';
import { ListTardinessConfigResponse, TardinessConfig } from '../interfaces';

@Injectable({providedIn: 'root'})
export class TardinessConfigService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getTardinessConfig( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListTardinessConfigResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListTardinessConfigResponse>(`${ this._baseUrl }/tardiness-config?${ queryParams }`);
  }

  getTardinessConfigById( id: string ): Observable<TardinessConfig> {
    return this._http.get<TardinessConfig>(`${ this._baseUrl }/tardiness-config/${ id }`);
  }

  createTardinessConfig( body: any ): Observable<TardinessConfig> {
    return this._http.post<TardinessConfig>(`${ this._baseUrl }/tardiness-config`, body );
  }

  updateTardinessConfig( id: string, body: any ): Observable<TardinessConfig> {
    return this._http.patch<TardinessConfig>(`${ this._baseUrl }/tardiness-config/${ id }`, body );
  }

  removeTardinessConfig( id: string ): Observable<TardinessConfig> {
    return this._http.delete<TardinessConfig>(`${ this._baseUrl }/tardiness-config/${ id }` );
  }


}
