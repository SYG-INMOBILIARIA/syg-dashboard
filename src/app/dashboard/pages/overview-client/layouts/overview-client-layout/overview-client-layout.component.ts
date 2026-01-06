import { CommonModule, formatCurrency } from '@angular/common';
import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '@app/auth/interfaces';
import { DashboardClientService } from '@app/dashboard/services/dashboard-client.service';
import { ContractQuote } from '@modules/admin/interfaces';
import { ContractQuoteService } from '@modules/admin/services/contract-quote.service';
import { Store } from '@ngrx/store';
import { initFlowbite } from 'flowbite';
import moment from 'moment';
import { Subscription } from 'rxjs';

// Interfaces
interface Payment {
  id: string;
  clientName: string;
  amount: number;
  date: Date;
  status: 'pending' | 'completed' | 'overdue';
  method: string;
  description: string;
}

interface Debt {
  id: string;
  clientName: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
  status: 'active' | 'resolved';
  description: string;
}

interface Statistic {
  title: string;
  value: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'now-datetime';
  icon: string;
  nowDate?: Date;
  showPercentage: boolean;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'payment' | 'debt' | 'system' | 'alert';
  amount?: number;
}

@Component({
  selector: 'app-overview-client-layout',
  templateUrl: './overview-client-layout.component.html',
  styles: ``
})
export class OverviewClientLayoutComponent implements OnInit, OnDestroy {

  @ViewChild('btnShowPaymentQuoteModal') btnShowPaymentQuoteModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnClosePaymentQuoteModal') btnClosePaymentQuoteModal!: ElementRef<HTMLButtonElement>;

  private _authRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store );
  // private _webUrlPermissionMethods = signal<WebUrlPermissionMethods[]>( [] );

  private _dashboardClientService = inject( DashboardClientService );
  private _clientId = signal<string | null>( null );


  // Data arrays
  payments: Payment[] = [];
  debts: Debt[] = [];
  statistics: Statistic[] = [];
  timeline: TimelineEvent[] = [];

  // Filter states
  searchTerm: string = '';
  statusFilter: string = 'all';
  tabs: string[] = ['payments', 'debts', 'charts', 'contracts', 'reservations']; //, 'timeline'

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;

  ngOnInit() {
    this._listenAuthRx();
  }

  private _listenAuthRx() {
    this._authRx$ = this._store.select('auth').subscribe( state  => {

      const { userAuthenticated, webUrlPermissionMethods } = state;

      // this._webUrlPermissionMethods.set( webUrlPermissionMethods );

      if ( userAuthenticated ) {

        const { client } = userAuthenticated;

        if ( client ) {

          this._clientId.set( client.id );
          this.loadIndicators( client.id );
          // this.onGetContractQuotes();
        } else {
          this._authRx$?.unsubscribe();
          throw new Error('Client not found!!!');
        }

      } else {
        this._authRx$?.unsubscribe();
        throw new Error('User not authenticated!!!');
      }

    });
  }

  loadIndicators( clientId: string ) {

    this._dashboardClientService.getOverviewIndicators( clientId )
    .subscribe(indicators => {

      const { paymentIndicators, quotesIndicators, debtIndicators, nextQuoteToPaid } = indicators;

      this.statistics = [
        {
          title: 'Total Pagado',
          value: formatCurrency(paymentIndicators.totalAmount, 'en-US', 'S/', 'PEN') ,
          change: paymentIndicators.percentageDifference,
          changeType:  paymentIndicators.percentageDifference > 0 ? 'increase' : 'decrease',
          icon: '💰',
          showPercentage: false
        },
        {
          title: 'Cuotas pendientes de pago',
          value: '' + quotesIndicators.totalUnpaidQuotes ,
          change: quotesIndicators.percentageDifference,
          changeType: quotesIndicators.percentageDifference > 0 ? 'increase' : 'decrease',
          icon: '⏳',
          showPercentage: true
        },
        {
          title: 'Deuda total',
          value: formatCurrency(debtIndicators.totalUnpaidAmount, 'en-US', 'S/', 'PEN'),
          change: debtIndicators.percentageDifference,
          changeType: debtIndicators.percentageDifference > 0 ? 'increase' : 'decrease',
          icon: '⚠️',
          showPercentage: true
        },
        {
          title: 'Próximo Pago',
          value: moment( nextQuoteToPaid.nextQuoteToPay?.paymentDate ).format('DD [de] MMMM YYYY'),
          change: 0,
          changeType: 'now-datetime',
          icon: '👥',
          nowDate: nextQuoteToPaid.lastPaidQuote?.paymentDate,
          showPercentage: true
        }
      ];

    });
  }

  onSearch() {
    this.currentPage = 1;
  }

  onStatusFilterChange() {
    this.currentPage = 1;
  }

  /** onGetContractQuotes( page = 1 ) {

    this._contractQuoteService.getContractQuoteByClient( page, 100, this._clientId()!, true )
    .subscribe( ( { contractQuotes, total } ) => {

      this._contractQuotes.set( contractQuotes );
      // this._contractQuotesTotal.set( total );

      setTimeout(() => {
        initFlowbite();
      }, 400);

    });

  }*/


  ngOnDestroy(): void {
    this._authRx$?.unsubscribe();
  }

}
