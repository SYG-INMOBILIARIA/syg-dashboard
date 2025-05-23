import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environments } from '@envs/environments';
import { ValidationErrors } from '@angular/forms';
import { Lead, LeadBody, LeadIndicators, ListLeadResponse } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class LeadService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getLeads( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListLeadResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListLeadResponse>(`${ this._baseUrl }/lead?${ queryParams }`);
  }

  createLead( body: LeadBody ): Observable<Lead> {
    return this._http.post<Lead>(`${ this._baseUrl }/lead`, body );
  }

  assignAdvisor( body: { id: string; adviserUserId: string } ): Observable<Lead> {
    return this._http.post<Lead>(`${ this._baseUrl }/lead/assign-advisor`, body );
  }

  updateLead( id: string, body: LeadBody ): Observable<Lead> {
    return this._http.patch<Lead>(`${ this._baseUrl }/lead/${ id }`, body );
  }

  getLeadById( id: string ): Observable<Lead> {
    return this._http.get<Lead>(`${ this._baseUrl }/lead/${ id }`);
  }

  getIndicators(): Observable<LeadIndicators> {
    return this._http.get<LeadIndicators>(`${ this._baseUrl }/lead/indicators/cards`);
  }

  getLeadAlreadyExists( email: string, id?: string ): Observable< ValidationErrors | null > {
    return this._http.get<{ alreadyExists: boolean }>(`${ this._baseUrl }/lead/already-exists/${email}?id=${ id }`)
    .pipe(
      map( ({alreadyExists}) => {
        return alreadyExists ? { alreadyexists: true } : null;
      } )
    );;
  }

  convertLeadToClient( id: string ): Observable<Lead> {
    return this._http.delete<Lead>(`${ this._baseUrl }/lead/convert-to-client/${ id }` );
  }

}
