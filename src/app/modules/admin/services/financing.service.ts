import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable } from 'rxjs';

import { Financing, ListFinancingsResponse } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class FinancingService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getFinancings( proyectId: string, page: number, filter: string, limit = 10, showInactive = false ): Observable<ListFinancingsResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListFinancingsResponse>(`${ this._baseUrl }/financing/by-proyect/${ proyectId }?${ queryParams }`);
  }

  createFinancing( body: any ): Observable<any> {
    return this._http.post<Financing>(`${ this._baseUrl }/financing`, body );
  }

}
