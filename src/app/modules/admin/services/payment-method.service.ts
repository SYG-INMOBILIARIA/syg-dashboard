import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable } from 'rxjs';
import { ListPaymentsMethodResponse, PaymentMethod } from '../interfaces';

@Injectable({providedIn: 'root'})
export class PaymentMethodService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getPaymentsMethod( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListPaymentsMethodResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListPaymentsMethodResponse>(`${ this._baseUrl }/payment-method?${ queryParams }`);
  }

  createPaymentMethod( body: any ): Observable<PaymentMethod> {
    return this._http.post<PaymentMethod>(`${ this._baseUrl }/payment-method`, body );
  }

  updatePaymentMethod( id: string, body: any ): Observable<PaymentMethod> {
    return this._http.patch<PaymentMethod>(`${ this._baseUrl }/payment-method/${ id }`, body );
  }

  getPaymentMethodById( id: string ): Observable<PaymentMethod> {
    return this._http.get<PaymentMethod>(`${ this._baseUrl }/payment-method/${ id }`);
  }

  removePaymentMethod( id: string ): Observable<PaymentMethod> {
    return this._http.delete<PaymentMethod>(`${ this._baseUrl }/payment-method/${ id }` );
  }

}
