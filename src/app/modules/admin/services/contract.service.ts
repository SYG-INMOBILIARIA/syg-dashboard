import { HttpClient } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TextOptionsLight, jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

import { environments } from '@envs/environments';
import { Contract, ContractByID, ContractLotesBusied, ListContractResponse, ContractPaymentScheduleResponse, ContractQuote } from '../interfaces';
import moment from 'moment';
// import { MomentPipe } from '@pipes/moment.pipe';
import { DecimalPipe } from '@angular/common';
import { MomentPipe } from '@pipes/moment.pipe';

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  constructor(
    private momentPipe: MomentPipe,
    private decimalPipe: DecimalPipe
  ) {}


  private _formatFechaPago( fecha: string | Date ): string {
    return (this.momentPipe.transform(fecha, 'createAt') as string) ?? '-';
  }

  private _formatMonto( value: number ) {
    return this.decimalPipe.transform(value ?? 0, '1.2-2', 'en-US') ?? '0.00';
  }

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

  getContractsByClient( clientId: string ): Observable<ListContractResponse> {
    return this._http.get<ListContractResponse>(`${ this._baseUrl }/contract/by-client/${ clientId }`);
  }

  getContractById( contractId: string ): Observable<ContractByID> {
    return this._http.get<ContractByID>(`${ this._baseUrl }/contract/${ contractId }`);
  }

  getPaymentScheduleByContract( contractId: string ): Observable<ContractPaymentScheduleResponse> {
    return this._http.get<ContractPaymentScheduleResponse>(`${ this._baseUrl }/contract/payment-schedule/${ contractId }`);
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

  downloadPaymentSchedule( contract: Contract, quotes: ContractQuote[] ) {

      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      // const paidSet = new Set(paidQuoteNumbers);


      // ===== Header minimalista =====
      doc.setFillColor(245, 247, 250);
      doc.rect(0, 0, 210, 34, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('Cronograma de Cuotas', 14, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Contrato: ${contract.code}`, 14, 19);
      doc.text(`Fecha contrato: ${  moment( contract.contractDate ).format('DD [de] MMMM YYYY') }`, 14, 24);
      // doc.text(`Cliente: ${contract.clients?.[0]!.fullname ?? 'N/D'}`, 14, 29);

      doc.text(`Proyecto: ${contract.proyect?.name ?? 'N/D'}`, 115, 19);
      // doc.text(`Lotes: ${contract.lotes?.length ?? 0}`, 115, 24);
      doc.text(`Tipo pago: ${String(contract.paymentType)}`, 115, 24);

      // 1) Construir textos para múltiples clientes/lotes
      const clientNames = (contract.clients ?? [])
        .map(c => [c.fullname, c.name, c.surname].find(Boolean) ?? 'Sin nombre')
        .join(', ');

      const lotesLabel = (contract.lotes ?? [])
        .map(l => {
          const mz = l.mz ?? '-';
          const num = l.numberLote ?? '-';
          return `MZ ${mz} - Lote ${num}`;
        });

      // 2) Pintar clientes en multilinea (evita que se corte)
      doc.setFont('helvetica', 'bold');
      doc.text('Clientes:', 14, 30);
      doc.setFont('helvetica', 'normal');
      const clientLines = doc.splitTextToSize(clientNames || 'N/D', 90);
      doc.text(clientLines, 32, 30);


      doc.setFont('helvetica', 'bold');
      doc.text('Lotes:', 115, 30);
      doc.setFont('helvetica', 'normal');
      const bottomLotesY = this._drawLoteBoxes(doc, lotesLabel, 128, 32);

      // 4) Ajustar startY de la tabla dinámicamente
      const bottomClientsY = 29 + (clientLines.length - 1) * 4.5;
      const tableStartY = Math.max(40, bottomClientsY + 10, bottomLotesY + 10);

      // ===== Tabla =====
      autoTable(doc, {
        startY: 40,
        head: [['N°', 'Vencimiento', 'Monto cuota', 'Estado']],
        body: quotes.map(q => [
          q.order,
          this._formatFechaPago(q.paymentDate),
          `S/ ${this._formatMonto(q.amountToPay)}`,
          q.isPaid ? 'PAGADA' : 'PENDIENTE'
        ]),
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineWidth: 0.15,
          lineColor: [225, 225, 225]
        },
        headStyles: {
          fillColor: [33, 37, 41],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          2: { halign: 'right', cellWidth: 30 },
          3: { halign: 'center', cellWidth: 30 }
        },
        didParseCell: (hook) => {
          if (hook.section === 'body' && hook.column.index === 3) {
            const status = hook.cell.raw as string;
            if (status === 'PAGADA') {
              hook.cell.styles.fillColor = [224, 247, 233];
              hook.cell.styles.textColor = [19, 115, 51];
              hook.cell.styles.fontStyle = 'bold';
            } else {
              hook.cell.styles.fillColor = [255, 243, 224];
              hook.cell.styles.textColor = [180, 83, 9];
              hook.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // ===== Resumen =====
      const paid = quotes.filter(q => q.isPaid === true).length;
      const pending = quotes.length - paid;
      const total = quotes.reduce((s, q) => s + q.amountToPay, 0);
      const y = (doc as any).lastAutoTable.finalY + 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen', 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`Pagadas: ${paid}`, 14, y + 6);
      doc.text(`Pendientes: ${pending}`, 60, y + 6);
      doc.text(`Total cronograma: S/ ${this._formatMonto(total)}`, 120, y + 6);

      doc.save(`cronograma-${contract.code}.pdf`);

  }


  // 3) Pintar lotes en "cajas" con borde (chips)
  private _drawLoteBoxes(doc: jsPDF, labels: string[], x: number, y: number, maxW = 82) {
    let cx = x, cy = y;
    const h = 7;
    const gap = 2;

    labels.forEach(label => {
      const w = Math.min(maxW, doc.getTextWidth(label) + 6);
      if (cx + w > x + maxW) { // salto de línea
        cx = x;
        cy += h + gap;
      }
      doc.setDrawColor(180, 180, 180);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, cy - 5.2, w, h, 1.2, 1.2, 'FD');
      doc.setFontSize(8.5);
      doc.text(label, cx + 3, cy - 0.5);
      cx += w + gap;
    });

    return cy + 3; // último Y útil
  }

  updateWritingStatus( contractId: string, body: any ): Observable<Contract> {
    return this._http.patch<Contract>(`${ this._baseUrl }/contract/writing-status/${ contractId }`, body );
  }

  deleteContract( contractId: string ): Observable<Contract> {
    return this._http.delete<Contract>(`${ this._baseUrl }/contract/${ contractId }` );
  }

}
