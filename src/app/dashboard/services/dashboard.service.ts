


import { HttpClient } from '@angular/common/http';
import { RecentActivity } from '../interfaces/dahsboard.interface';
import { ClientStatus } from '../interfaces/dahsboard.interface';
import { inject, Injectable } from '@angular/core';
import { environments } from '@envs/environments';
import { DashboardStats, MonthlyCommissions, SellerPerformance } from '../interfaces';
import { Observable } from 'rxjs';

@Injectable({providedIn: 'root'})
export class DashboardService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getDashboardStats(): Observable<DashboardStats> {
    return this._http.get<DashboardStats>(`${this._baseUrl}/dashboard/stats`);
  }

  getTopSellers(): Observable<SellerPerformance[]> {
    return this._http.get<SellerPerformance[]>(`${this._baseUrl}/dashboard/top-sellers`);
  }

  getMonthlyCommissions(): Observable<MonthlyCommissions[]> {
    return this._http.get<MonthlyCommissions[]>(`${this._baseUrl}/dashboard/monthly-commissions`);
  }

  getClientStatusDistribution(): Observable<ClientStatus[]> {
    return this._http.get<ClientStatus[]>(`${this._baseUrl}/dashboard/client-status`);
  }

  getRecentActivity(): Observable<RecentActivity[]> {
    return this._http.get<RecentActivity[]>(`${this._baseUrl}/dashboard/recent-activity`);
  }

}