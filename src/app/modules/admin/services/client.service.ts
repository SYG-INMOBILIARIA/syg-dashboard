import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environments } from '@envs/environments';
import { Client, ClientBody, ListClientResponse } from '../interfaces';
import { ValidationErrors } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getClients( page: number, filter: string, limit = 10, showInactive = false, dptCode: string | null, provCode: string | null, distCode: string | null ): Observable<ListClientResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&dptCode=${ dptCode }`;
    queryParams += `&provCode=${ provCode }`;
    queryParams += `&distCode=${ distCode }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListClientResponse>(`${ this._baseUrl }/client?${ queryParams }`);
  }

  createClient( body: ClientBody ): Observable<Client> {
    return this._http.post<Client>(`${ this._baseUrl }/client`, body );
  }

  updateClient( id: string, body: ClientBody ): Observable<Client> {
    return this._http.patch<Client>(`${ this._baseUrl }/client/${ id }`, body );
  }

  getClientById( id: string ): Observable<Client> {
    return this._http.get<Client>(`${ this._baseUrl }/client/${ id }`);
  }

  getClientAlreadyExists( identityNumber: string, id?: string ): Observable< ValidationErrors | null > {
    return this._http.get<{ alreadyExists: boolean }>(`${ this._baseUrl }/client/already-exists/${identityNumber}?id=${ id }`)
    .pipe(
      map( ({alreadyExists}) => {
        return alreadyExists ? { alreadyexists: true } : null;
      } )
    );;
  }

  removeClient( id: string ): Observable<Client> {
    return this._http.delete<Client>(`${ this._baseUrl }/client/${ id }` );
  }

}
