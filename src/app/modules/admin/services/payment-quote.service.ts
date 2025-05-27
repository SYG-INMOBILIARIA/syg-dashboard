import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { PaymentQuoteBody } from '../interfaces';

@Injectable({providedIn: 'root'})
export class PaymentQuoteService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  createPaymentQuote( body: PaymentQuoteBody ): Observable<any> {
    return this._http.post<any>(`${ this._baseUrl }/payment-quote`, body );
  }

}
