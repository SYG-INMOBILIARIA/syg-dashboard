import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { environments } from '@envs/environments';
import { Observable, map } from 'rxjs';
import { ListExpenseTypeResponse } from '../interfaces';

@Injectable({providedIn: 'root'})
export class ExpenseTypeService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getExpenseTypes( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListExpenseTypeResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListExpenseTypeResponse>(`${ this._baseUrl }/expense-type?${ queryParams }`);
  }

  getExpenseTypeById( id: string ): Observable<any> {
    return this._http.get<any>(`${ this._baseUrl }/expense-type/${ id }`);
  }

  getExpenseTypeAlreadyExists( code: string, id?: string ): Observable<ValidationErrors | null> {
    return this._http.get<{ alreadyExists: boolean }>(`${ this._baseUrl }/expense-type/already-exists/${ code }?id=${id}`)
      .pipe(
        map( ({alreadyExists}) => {
          return alreadyExists ? { alreadyexists: true } : null;
        } )
      );
  }

  createExpenseType( body: any ): Observable<any> {
    return this._http.post<any>(`${ this._baseUrl }/expense-type`, body );
  }

  updateExpenseType( id: string, body: any ): Observable<any> {
    return this._http.patch<any>(`${ this._baseUrl }/expense-type/${ id }`, body );
  }

  removeExpenseType( id: string ): Observable<any> {
    return this._http.delete<any>(`${ this._baseUrl }/expense-type/${ id }` );
  }

}
