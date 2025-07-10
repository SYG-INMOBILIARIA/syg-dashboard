import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { ListDepartmentResponse, ListDistrictResponse, ListProvinceResponse } from '../interfaces';

@Injectable({providedIn: 'root'})
export class UbigeoService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getDepartments(  ): Observable<ListDepartmentResponse> {
    let queryParams = `countryCode=PE`;
    return this._http.get<ListDepartmentResponse>(`${ this._baseUrl }/department?${ queryParams }`);
  }

  getProvinces( dptCode: string ): Observable<ListProvinceResponse> {

    let queryParams = 'countryCode=PE';
    queryParams += `&dptCode=${ dptCode }`;

    return this._http.get<ListProvinceResponse>(`${ this._baseUrl }/province?${ queryParams }`);
  }

  getDistricts( dptCode: string, provCode: string ): Observable<ListDistrictResponse> {

    let queryParams = 'countryCode=PE';
    queryParams += `&dptCode=${ dptCode }`;
    queryParams += `&provCode=${ provCode }`;

    return this._http.get<ListDistrictResponse>(`${ this._baseUrl }/district?${ queryParams }`);
  }

}
