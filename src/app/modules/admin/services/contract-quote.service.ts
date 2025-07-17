import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable } from 'rxjs';
import { ContractQuote, ListContractQuoteResponse } from '../interfaces';

@Injectable({providedIn: 'root'})
export class ContractQuoteService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getContractQuotes( page: number, filter: string, contractId: string | null, limit = 10, onlyIsNotPaid?: boolean, showInactive = false ): Observable<ListContractQuoteResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&contractId=${ contractId }`;
    queryParams += `&onlyIsNotPaid=${ onlyIsNotPaid }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListContractQuoteResponse>(`${ this._baseUrl }/contract-quote?${ queryParams }`);
  }

  getContractQuoteById( id: string ): Observable<ContractQuote> {
    return this._http.get<ContractQuote>(`${ this._baseUrl }/contract-quote/${ id }`);
  }

  getContractQuoteByClient(page: number, limit = 10, clientId: string, onlyIsNotPaid = false, onlyIsPaid = false ): Observable<ListContractQuoteResponse> {

    let queryParams = `page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&onlyIsNotPaid=${ onlyIsNotPaid }`;
    queryParams += `&onlyIsPaid=${ onlyIsPaid }`;

    console.log({queryParams});

    return this._http.get<ListContractQuoteResponse>(`${ this._baseUrl }/contract-quote/by-client/${ clientId }?${ queryParams }` );
  }

  exonerateTardiness( id: string ): Observable<ContractQuote> {
    return this._http.patch<ContractQuote>(`${ this._baseUrl }/contract-quote/exonerate-tardiness/${ id }`, {});
  }

}
