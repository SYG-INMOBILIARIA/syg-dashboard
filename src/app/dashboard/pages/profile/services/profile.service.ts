import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { ClientIndicators, MyCommissionsResponse, SellerIndicatorsResponse, SellerPaymentIndicatorsResponse } from '../interfaces';
import { ListClientResponse } from '@modules/admin/interfaces';

@Injectable({providedIn: 'root'})
export class ProfileService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getSellerIndicators( sellerUserId: string ): Observable<SellerIndicatorsResponse> {
    return this._http.get<SellerIndicatorsResponse>(`${ this._baseUrl }/profile/indicators/home/${ sellerUserId }`);
  }

  getClientIndicators( sellerUserId: string ): Observable<ClientIndicators> {
    return this._http.get<ClientIndicators>(`${ this._baseUrl }/profile/indicators/client/${ sellerUserId }`);
  }

  getSellerPaymentsIndicators( sellerUserId: string ): Observable<SellerPaymentIndicatorsResponse> {
    return this._http.get<SellerPaymentIndicatorsResponse>(`${ this._baseUrl }/profile/indicators/payments/${sellerUserId}`);
  }

  getMyClients( page: number, filter: string, limit = 10, sellerUserId = '', showInactive = false ): Observable<ListClientResponse> {
    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;
    queryParams += `&sellerUserId=${ sellerUserId }`;

    return this._http.get<ListClientResponse>(`${ this._baseUrl }/profile/my-clients?${ queryParams }`);
  }

  getMyCommissions( page: number, filter: string, limit = 10, sellerUserId = '', showInactive = false ): Observable<MyCommissionsResponse> {
    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;
    queryParams += `&sellerUserId=${ sellerUserId }`;


    return this._http.get<MyCommissionsResponse>(`${ this._baseUrl }/profile/my-commissions?${ queryParams }`);
  }

}
