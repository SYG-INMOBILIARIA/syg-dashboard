import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { ListReservationsResponse, Reservation } from '../pages/reservation/interfaces';

@Injectable({providedIn: 'root'})
export class ReservationService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getReservations( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListReservationsResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListReservationsResponse>(`${ this._baseUrl }/reservation?${ queryParams }`);
  }

  createReservation( body: any ): Observable<Reservation> {
    return this._http.post<Reservation>(`${ this._baseUrl }/reservation`, body );
  }

  updateReservation( id: string, body: any ): Observable<Reservation> {
    return this._http.patch<Reservation>(`${ this._baseUrl }/reservation/${ id }`, body );
  }

  getReservationById( id: string ): Observable<Reservation> {
    return this._http.get<Reservation>(`${ this._baseUrl }/reservation/${ id }`);
  }

  removeReservation( id: string ): Observable<Reservation> {
    return this._http.delete<Reservation>(`${ this._baseUrl }/reservation/${ id }` );
  }

}
