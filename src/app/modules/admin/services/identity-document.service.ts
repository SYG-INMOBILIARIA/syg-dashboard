import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environments } from '@envs/environments';
import { ListIdentityDocumentResponse } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class IdentityDocumentService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getIdentityDocuments() {
    return this._http.get<ListIdentityDocumentResponse>(`${ this._baseUrl }/identity-document`);
  }

}
