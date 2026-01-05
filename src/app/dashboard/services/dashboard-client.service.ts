import { inject, Injectable } from '@angular/core';
import { environments } from '@envs/environments';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OverviewClientIndicatorsResponse } from '../interfaces/dashboard-client.interface';
import { DebtsByStatus, ListPaymentQuoteByClientResponse, PaymentGroupByMonth } from '../interfaces';
import { ListContractResponse } from '@modules/admin/interfaces';
import { ListReservationsResponse } from '@modules/admin/pages/reservation/interfaces';

@Injectable({
  providedIn: 'root'
})
export class DashboardClientService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getOverviewIndicators( clientId: string ): Observable<OverviewClientIndicatorsResponse> {
    const queryParams = '?clientId=' + clientId;
    return this._http.get<OverviewClientIndicatorsResponse>(`${this._baseUrl}/dashboard-client/indicators${queryParams}`);
  }

  getPaymentsByClient( page: number, limit: number, clientId: string ): Observable<ListPaymentQuoteByClientResponse> {
    let queryParams = `?page=${page}`;
    queryParams += `&limit=${limit}`;
    // queryParams += `&fromDate=${fromDate}`;
    // queryParams += `&toDate=${toDate}`;
    queryParams += `&clientId=${clientId}`;

    return this._http.get<ListPaymentQuoteByClientResponse>(`${this._baseUrl}/dashboard-client/payments${queryParams}`);
  }

  getContractsByClient( page: number, limit: number, filter: string, clientId: string ): Observable<ListContractResponse> {
    let queryParams = `?page=${page}`;
    queryParams += `&limit=${limit}`;
    queryParams += `&filter=${filter}`;

    return this._http.get<ListContractResponse>(`${this._baseUrl}/contract/by-client/${clientId}${queryParams}`);
  }

  getReservationsByClient( page: number, limit: number, filter: string, clientId: string ): Observable<ListReservationsResponse> {
    let queryParams = `?page=${page}`;
    queryParams += `&limit=${limit}`;
    queryParams += `&filter=${filter}`;

    return this._http.get<ListReservationsResponse>(`${this._baseUrl}/reservation/by-client/${clientId}${queryParams}`);
  }

  getPaymentsGroupedByMonth( clientId: string ): Observable<PaymentGroupByMonth[]> {
    const queryParams = `?clientId=${clientId}`;
    return this._http.get<PaymentGroupByMonth[]>(`${this._baseUrl}/dashboard-client/payments-group-by-month${queryParams}`);
  }

  getDebtsGroupedByState( clientId: string ): Observable<DebtsByStatus> {
    const queryParams = `?clientId=${clientId}`;
    return this._http.get<DebtsByStatus>(`${this._baseUrl}/dashboard-client/debts-group-by-status${queryParams}`);
  }

}
