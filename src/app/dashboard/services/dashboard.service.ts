


import { HttpClient } from '@angular/common/http';
import { RecentActivity } from '../interfaces/dahsboard.interface';
import { ClientStatus } from '../interfaces/dahsboard.interface';
import { inject, Injectable } from '@angular/core';
import { environments } from '@envs/environments';
import { DashboardStats, MonthlyCommissions, SellerPerformance } from '../interfaces';
import { firstValueFrom, Observable } from 'rxjs';
import { VisitGrouped } from '../components/visit-percent-status-card/interfaces';
import { VisitorsByYear } from '../components/visitor-counter-card/interfaces';

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

  getVisitsYears(): Promise<number[]> {
    return firstValueFrom(
      this._http.get<number[]>(`${this._baseUrl}/dashboard/visit-years`)
    );
  }

  getVisitsStatus( year: number ): Observable<VisitGrouped> {
    return this._http.get<VisitGrouped>(`${this._baseUrl}/dashboard/visit-status?year=${year}`);
  }

  getVisitorYears(): Promise<number[]> {
    return firstValueFrom(
      this._http.get<number[]>(`${this._baseUrl}/dashboard/visitor-years`)
    );
  }

  getCountVisitorByYear( year: number ): Observable<VisitorsByYear> {
    return this._http.get<VisitorsByYear>(`${this._baseUrl}/dashboard/count-visitors-by-year?year=${year}`);
  }

}
