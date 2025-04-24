import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environments } from '@envs/environments';
import { Observable } from 'rxjs';
import { Expense, ExpenseBody, ListExpenseResponse } from '../interfaces';

@Injectable({providedIn: 'root'})
export class ExpenseService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getExpenses( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListExpenseResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListExpenseResponse>(`${ this._baseUrl }/expense?${ queryParams }`);
  }

  createExpense( body: ExpenseBody ): Observable<Expense> {
    return this._http.post<Expense>(`${ this._baseUrl }/expense`, body );
  }

  updateExpense( id: string, body: ExpenseBody ): Observable<Expense> {
    return this._http.patch<Expense>(`${ this._baseUrl }/expense/${ id }`, body );
  }

  getExpenseById( id: string ): Observable<Expense> {
    return this._http.get<Expense>(`${ this._baseUrl }/expense/${ id }`);
  }

  removeExpense( id: string ): Observable<Expense> {
    return this._http.delete<Expense>(`${ this._baseUrl }/expense/${ id }` );
  }

}
