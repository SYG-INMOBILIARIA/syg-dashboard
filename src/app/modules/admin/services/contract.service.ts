import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { Contract, ListContractResponse } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getContracts( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListContractResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListContractResponse>(`${ this._baseUrl }/contract?${ queryParams }`);
  }

  createContract( body: any ): Observable<Contract> {
    return this._http.post<Contract>(`${ this._baseUrl }/contract`, body );
  }

}
