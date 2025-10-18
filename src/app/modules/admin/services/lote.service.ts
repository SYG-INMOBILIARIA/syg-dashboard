import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { ListLotesResponse, Lote } from '../interfaces';
import { Observable } from 'rxjs';
import { MzByProyect } from '../pages/lotes-by-proyect/interfaces';

@Injectable({
  providedIn: 'root'
})
export class LoteService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getLotes( proyectId: string, page: number, filter: string, limit = 10, showInactive = false ): Observable<ListLotesResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListLotesResponse>(`${ this._baseUrl }/lote/by-proyect/${proyectId}?${ queryParams }`);
  }

  getLotesMz( proyectId: string ) {
    return this._http.get<MzByProyect[]>(`${ this._baseUrl }/lote/mz/by-proyect/${proyectId}`);
  }

  getLotesForMap( proyectId: string, page: number, filter: string, limit = 10, showInactive = false ): Observable<ListLotesResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListLotesResponse>(`${ this._baseUrl }/lote/by-proyect-for-map/${proyectId}?${ queryParams }`);
  }

  getLoteById( proyectId: string ): Observable<Lote> {
    return this._http.get<Lote>(`${ this._baseUrl }/lote/${ proyectId }`);
  }

  createLote( body: any ): Observable<Lote> {
    return this._http.post<Lote>(`${ this._baseUrl }/lote`, body );
  }

  updateLote( id: string, body: any ): Observable<Lote> {
    return this._http.patch<Lote>(`${ this._baseUrl }/lote/${ id }`, body );
  }

  removeLote( id: string ): Observable<Lote> {
    return this._http.delete<Lote>(`${ this._baseUrl }/lote/${ id }` );
  }

}
