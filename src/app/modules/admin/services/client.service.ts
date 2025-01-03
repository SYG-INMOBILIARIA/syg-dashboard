import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { Client, ClientBody, ListClientResponse } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getClients( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListClientResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
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

  removeClient( id: string ): Observable<Client> {
    return this._http.delete<Client>(`${ this._baseUrl }/client/${ id }` );
  }

}
