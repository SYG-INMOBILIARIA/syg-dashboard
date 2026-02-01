import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environments } from '@envs/environments';
import { ListVisitResponse, Visit, VisitBody } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class VisitService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getVisits( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListVisitResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListVisitResponse>(`${ this._baseUrl }/visit?${ queryParams }`);
  }

  createVisit( body: VisitBody ): Observable<Visit> {
    return this._http.post<Visit>(`${ this._baseUrl }/visit`, body );
  }

  updateVisit( id: string, body: VisitBody ): Observable<Visit> {
    return this._http.patch<Visit>(`${ this._baseUrl }/visit/${ id }`, body );
  }

  getVisitById( id: string ): Observable<Visit> {
    return this._http.get<Visit>(`${ this._baseUrl }/visit/${ id }`);
  }


  removeVisit( id: string ): Observable<Visit> {
    return this._http.delete<Visit>(`${ this._baseUrl }/visit/${ id }` );
  }

}
