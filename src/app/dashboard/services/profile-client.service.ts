import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable } from 'rxjs';
import { ClientProfileIndicatorsResponse } from '../interfaces';

@Injectable({providedIn: 'root'})
export class ProfileClientService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getClientIndicators( clientId: string ): Observable<ClientProfileIndicatorsResponse> {
    return this._http.get<ClientProfileIndicatorsResponse>(`${this._baseUrl}/profile-client/indicators/${ clientId }`);
  }


}
