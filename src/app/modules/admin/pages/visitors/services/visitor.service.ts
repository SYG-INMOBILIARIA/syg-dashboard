import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environments } from '@envs/environments';
import { ValidationErrors } from '@angular/forms';
import { ListVisitorResponse, Visitor } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class VisitorService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getVisitors( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListVisitorResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListVisitorResponse>(`${ this._baseUrl }/visitor?${ queryParams }`);
  }

  createVisitor( body: any ): Observable<Visitor> {
    return this._http.post<Visitor>(`${ this._baseUrl }/visitor`, body );
  }

  updateVisitor( id: string, body: any ): Observable<Visitor> {
    return this._http.patch<Visitor>(`${ this._baseUrl }/visitor/${ id }`, body );
  }

  getVisitorById( id: string ): Observable<Visitor> {
    return this._http.get<Visitor>(`${ this._baseUrl }/visitor/${ id }`);
  }

  getVisitorAlreadyExists( identityNumber: string, id?: string ): Observable< ValidationErrors | null > {
    return this._http.get<{ alreadyExists: boolean }>(`${ this._baseUrl }/visitor/already-exists/${identityNumber}?id=${ id }`)
    .pipe(
      map( ({alreadyExists}) => {
        return alreadyExists ? { alreadyexists: true } : null;
      } )
    );
  }

  removeVisitor( id: string ): Observable<Visitor> {
    return this._http.delete<Visitor>(`${ this._baseUrl }/visitor/${ id }` );
  }

}
