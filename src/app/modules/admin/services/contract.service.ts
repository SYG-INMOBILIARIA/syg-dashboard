import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TextOptionsLight, jsPDF } from "jspdf";

import { environments } from '@envs/environments';
import { Contract, ContractByID, ContractLotesBusied, ListContractResponse, PaymentSchedule } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getContracts( page: number, filter: string, limit = 10, showInactive = false ): Observable<ListContractResponse> {

    let queryParams = `filter=${ filter }`;
    queryParams += `&page=${ page }`;
    queryParams += `&limit=${ limit }`;
    queryParams += `&isActive=${ !showInactive }`;

    return this._http.get<ListContractResponse>(`${ this._baseUrl }/contract?${ queryParams }`);
  }

  createContract( body: any ): Observable<Contract> {
    return this._http.post<Contract>(`${ this._baseUrl }/contract`, body );
  }

  getContractsByProyect( proyectId: string ): Observable<ContractLotesBusied[]> {
    return this._http.get<ContractLotesBusied[]>(`${ this._baseUrl }/contract/by-proyect/${ proyectId }`);
  }

  getContractById( contractId: string ): Observable<ContractByID> {
    return this._http.get<ContractByID>(`${ this._baseUrl }/contract/${ contractId }`);
  }

  getPaymentScheduleByContract( contractId: string ): Observable<PaymentSchedule> {
    return this._http.get<PaymentSchedule>(`${ this._baseUrl }/contract/payment-schedule/${ contractId }`);
  }

  getDowlandPaymentSchedule( divHtmlId: string ): Promise<void> {

    const element = document.getElementById( divHtmlId );

    if( !element ) throw new Error('Not found html element to pdf!!');

    return new Promise( (resolve, reject) => {

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts:true
      });

      doc.html( element, { callback: ( pdf ) => {
          pdf.save('shedule.pdf');

          return resolve();
        }
        , x: 15
        , y: 10
        , html2canvas: { scale: 0.3 }
      } );

    });

  }

}
