import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environments } from '@envs/environments';
import { ListSellerPaymentResponse, SellerPayment, SellerPaymentBody } from '../../../profile/interfaces';

@Injectable({providedIn: 'root'})
export class SellerPaymentService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getSellerPayments( page: number, filter: string, limit = 10, sellerUserId = 'xD', showInactive = false ): Observable<ListSellerPaymentResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;
    queryParams += `&sellerUserId=${ sellerUserId }`;

    return this._http.get<ListSellerPaymentResponse>(`${ this._baseUrl }/seller-payment?${ queryParams }`);
  }

  createSellerPayment( body: SellerPaymentBody ): Observable<SellerPayment> {
    return this._http.post<SellerPayment>(`${ this._baseUrl }/seller-payment`, body );
  }

  updateSellerPayment( id: string, body: SellerPaymentBody ): Observable<SellerPayment> {
    return this._http.patch<SellerPayment>(`${ this._baseUrl }/seller-payment/${ id }`, body );
  }

  getSellerPaymentById( id: string ): Observable<SellerPayment> {
    return this._http.get<SellerPayment>(`${ this._baseUrl }/seller-payment/${ id }`);
  }

  removeSellerPayment( id: string ): Observable<SellerPayment> {
    return this._http.delete<SellerPayment>(`${ this._baseUrl }/seller-payment/${ id }` );
  }

}
