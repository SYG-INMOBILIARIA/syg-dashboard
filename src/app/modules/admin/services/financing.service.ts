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

  getFinancingById( id: string ): Observable<Financing> {
    return this._http.get<Financing>(`${ this._baseUrl }/financing/${ id }` );
  }

  updateFinancing( id: string, body: any ): Observable<Financing> {
    return this._http.patch<Financing>(`${ this._baseUrl }/financing/${ id }`, body );
  }

  deleteFinancing( id: string ): Observable<Financing> {
    return this._http.delete<Financing>(`${ this._baseUrl }/financing/${ id }` );
  }

}
