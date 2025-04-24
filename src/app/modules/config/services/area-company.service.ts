import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { environments } from '@envs/environments';
import { Observable, map } from 'rxjs';
import { AreaCompany, ListAreaCompanyResponse } from '../interfaces';

@Injectable({providedIn: 'root'})
export class AreaCompanyService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getAreasCompany( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListAreaCompanyResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListAreaCompanyResponse>(`${ this._baseUrl }/area-company?${ queryParams }`);
  }

  getAreaCompanyById( id: string ): Observable<AreaCompany> {
    return this._http.get<AreaCompany>(`${ this._baseUrl }/area-company/${ id }`);
  }

  getArealreadyExists( code: string, id?: string ): Observable<ValidationErrors | null> {
    return this._http.get<{ alreadyExists: boolean }>(`${ this._baseUrl }/area-company/already-exists/${ code }?id=${id}`)
      .pipe(
        map( ({alreadyExists}) => {
          return alreadyExists ? { alreadyexists: true } : null;
        } )
      );
  }

  createAreaCompany( body: any ): Observable<AreaCompany> {
    return this._http.post<AreaCompany>(`${ this._baseUrl }/area-company`, body );
  }

  updateAreaCompany( id: string, body: any ): Observable<AreaCompany> {
    return this._http.patch<AreaCompany>(`${ this._baseUrl }/area-company/${ id }`, body );
  }

  removeAreaCompany( id: string ): Observable<AreaCompany> {
    return this._http.delete<AreaCompany>(`${ this._baseUrl }/area-company/${ id }` );
  }

}
