import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { ClientBody } from '../interfaces/client-body.interface';
import { Client } from '../interfaces/client.interface';
import { ListSellersResponse, Seller } from '../interfaces';

@Injectable({providedIn: 'root'})
export class SellerService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getSellers( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListSellersResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListSellersResponse>(`${ this._baseUrl }/seller?${ queryParams }`);
  }

  createSeller( body: any ): Observable<Seller> {
    return this._http.post<Seller>(`${ this._baseUrl }/seller`, body );
  }

  updateSeller( id: string, body: any ): Observable<Seller> {
    return this._http.patch<Seller>(`${ this._baseUrl }/seller/${ id }`, body );
  }

  getSellerById( id: string ): Observable<Seller> {
    return this._http.get<Seller>(`${ this._baseUrl }/seller/${ id }`);
  }

  /**getSellerAlreadyExists( identityNumber: string, id?: string ): Observable< ValidationErrors | null > {
    return this._http.get<{ alreadyExists: boolean }>(`${ this._baseUrl }/seller/already-exists/${identityNumber}?id=${ id }`)
    .pipe(
      map( ({alreadyExists}) => {
        return alreadyExists ? { alreadyexists: true } : null;
      } )
    );
  }*/

  removeSeller( id: string ): Observable<Seller> {
    return this._http.delete<Seller>(`${ this._baseUrl }/seller/${ id }` );
  }

}