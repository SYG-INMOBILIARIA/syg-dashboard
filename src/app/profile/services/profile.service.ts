import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { ClientIndicators, SellerIndicatorsResponse } from '../interfaces';
import { ListClientResponse } from '../../modules/admin/interfaces';

@Injectable({providedIn: 'root'})
export class ProfileService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getSellerIndicators(): Observable<SellerIndicatorsResponse> {
    return this._http.get<SellerIndicatorsResponse>(`${ this._baseUrl }/profile/indicators/home`);
  }

  getClientIndicators(): Observable<ClientIndicators> {
    return this._http.get<ClientIndicators>(`${ this._baseUrl }/profile/indicators/client`);
  }

  getMyClients( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListClientResponse> {
    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListClientResponse>(`${ this._baseUrl }/profile/my-clients?${ queryParams }`);
  }

}
