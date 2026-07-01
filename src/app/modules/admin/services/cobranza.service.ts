import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environments } from '@envs/environments';
import { PortfolioResponse, PortfolioStatus } from '../pages/paid-quotes/interfaces';

@Injectable({ providedIn: 'root' })
export class CobranzaService {
  private readonly _baseUrl = environments.baseUrl;
  private _http = inject(HttpClient);

  getPortfolio(status: PortfolioStatus, page = 1, filter = '', limit = 10): Observable<PortfolioResponse> {
    let params = `status=${status}`;
    params += `&page=${page}`;
    params += `&limit=${limit}`;
    params += `&filter=${filter}`;
    return this._http.get<PortfolioResponse>(`${this._baseUrl}/cobranza/contracts?${params}`);
  }
}
