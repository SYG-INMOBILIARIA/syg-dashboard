import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable } from 'rxjs';
import { ListProyectsResponse, Proyect, ProyectBody, ProyectById } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ProyectService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getProyects( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListProyectsResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListProyectsResponse>(`${ this._baseUrl }/proyect?${ queryParams }`);
  }

  getProyectById( proyectId: string ): Observable<ProyectById> {
    return this._http.get<ProyectById>(`${ this._baseUrl }/proyect/${ proyectId }`);
  }

  createProyect( body: ProyectBody ): Observable<Proyect> {
    return this._http.post<Proyect>(`${ this._baseUrl }/proyect`, body );
  }

  updateProyect( id: string, body: ProyectBody ): Observable<Proyect> {
    return this._http.patch<Proyect>(`${ this._baseUrl }/proyect/${ id }`, body );
  }

}
