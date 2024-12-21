import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environments } from '@envs/environments';
import { ListNomenclatureResponse } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class NomenclatureService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getPermissionsNomenclature() {
    return this._http.get<ListNomenclatureResponse>(`${ this._baseUrl }/nomenclature/permissions`);
  }

  getCivilStatus() {
    return this._http.get<ListNomenclatureResponse>(`${ this._baseUrl }/nomenclature/civil-status`);
  }

  getGender() {
    return this._http.get<ListNomenclatureResponse>(`${ this._baseUrl }/nomenclature/gender`);
  }

  getPersonType() {
    return this._http.get<ListNomenclatureResponse>(`${ this._baseUrl }/nomenclature/person-type`);
  }

  getLoteStatus() {
    return this._http.get<ListNomenclatureResponse>(`${ this._baseUrl }/nomenclature/lote-status`);
  }

}
