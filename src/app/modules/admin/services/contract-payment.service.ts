import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { ContractPayment, ContractPaymentBody, ListContractPaymentResponse } from '../interfaces';

@Injectable({providedIn: 'root'})
export class ContractPaymentService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getContractPayments( page: number, filter: string, contractCode: string, limit = 10, showInactive = false ): Observable<ListContractPaymentResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&contractCode=${ contractCode }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListContractPaymentResponse>(`${ this._baseUrl }/contract-payment?${ queryParams }`);
  }

  createContractPayment( body: ContractPaymentBody ): Observable<ContractPayment> {
    return this._http.post<ContractPayment>(`${ this._baseUrl }/contract-payment`, body );
  }

  updateContractPayment( id: string, body: ContractPaymentBody ): Observable<ContractPayment> {
    return this._http.patch<ContractPayment>(`${ this._baseUrl }/contract-payment/${ id }`, body );
  }

  getContractPaymentById( id: string ): Observable<ContractPayment> {
    return this._http.get<ContractPayment>(`${ this._baseUrl }/contract-payment/${ id }`);
  }

  removeContractPayment( id: string ): Observable<ContractPayment> {
    return this._http.delete<ContractPayment>(`${ this._baseUrl }/contract-payment/${ id }` );
  }

}
