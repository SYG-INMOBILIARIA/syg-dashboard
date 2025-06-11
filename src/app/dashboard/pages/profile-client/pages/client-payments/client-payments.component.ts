import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription, forkJoin } from 'rxjs';

import { ContractQuoteService } from '@modules/admin/services/contract-quote.service';
import { AppState } from '@app/app.config';
import { Client, ContractQuote } from '@modules/admin/interfaces';
import { initFlowbite } from 'flowbite';
import { AlertService } from '@shared/services/alert.service';
import { ProfileClientService } from '@app/dashboard/services/profile-client.service';
import { WebUrlPermissionMethods } from '@app/auth/interfaces';

@Component({
  templateUrl: './client-payments.component.html',
  styles: ``
})
export class ClientPaymentsComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _clientProfileRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods = signal<WebUrlPermissionMethods[]>( [] );

  private _contractQuoteService = inject( ContractQuoteService );
  private _profileClientService = inject( ProfileClientService );
  private _alertService = inject( AlertService );

  private _isLoading = signal<boolean>( false );
  private _isRemoving = signal( false );
  private _client = signal<Client | null>( null );
  private _contractQuotesAll = signal<ContractQuote[]>( [] );
  private _contractQuotes = signal<ContractQuote[]>( [] );
  private _contractQuoteToPay = signal<ContractQuote | null>( null );
  private _contractQuotesTotal = signal<number>( 0 );
  private _totalDebt = signal<number>( 0 );
  private _countDebt = signal<number>( 0 );
  private _totalPaid = signal<number>( 0 );
  private _countPaid = signal<number>( 0 );

  public isLoading = computed( () => this._isLoading() );
  public webUrlPermissionMethods = computed( () => this._webUrlPermissionMethods() );
  public isRemoving = computed( () => this._isRemoving() );
  public contractQuotesAll = computed( () => this._contractQuotesAll() );
  public contractQuotes = computed( () => this._contractQuotes() );
  public contractQuoteToPay = computed( () => this._contractQuoteToPay() );
  public contractQuotesTotal = computed( () => this._contractQuotesTotal() );
  public totalDebt = computed( () => this._totalDebt() );
  public countDebt = computed( () => this._countDebt() );
  public totalPaid = computed( () => this._totalPaid() );
  public countPaid = computed( () => this._countPaid() );

  ngOnInit(): void {
    this.onClientProfileListen();
    this.onListenAuthRx();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods.set( webUrlPermissionMethods );
    });
  }

  onClientProfileListen() {

    this._clientProfileRx$ = this._store.select('profile_client')
    .subscribe( (state) => {

      const { client, isLoading } = state;

      if( client != null ) {
        this._client.set( client );
        this.onGetContractQuotes();
      }

    });

  }

  onGetContractQuotes( page = 1 ) {

    this._isLoading.set( true );

    forkJoin({
      listContractQuotesByClient: this._contractQuoteService.getContractQuoteByClient( page, 10, this._client()!.id ),
      listContactQuotesAllByClient: this._contractQuoteService.getContractQuoteByClient( 1, 100, this._client()!.id ),
      // indicatorsResponse: this._profileClientService.getClientIndicators( this._client()!.id )
    })
    .subscribe( ( { listContractQuotesByClient, listContactQuotesAllByClient } ) => { // indicatorsResponse

      const { contractQuotes, total, resumen } = listContractQuotesByClient;
      this._isLoading.set( false );
      this._contractQuotes.set( contractQuotes );
      this._contractQuotesTotal.set( total );

      this._contractQuotesAll.set( listContactQuotesAllByClient.contractQuotes );

      // const { debtIndicators, paymentIndicators } = indicatorsResponse;

      // const { totalDebt, totalPaid, countOverdueDebt } = debtIndicators.reduce<{ totalDebt: number; totalPaid: number; countOverdueDebt: number }>( (acc, current) => {

      //   acc.totalDebt += (current.loteAmount + current.interestAmount);
      //   acc.totalPaid += (current.totalPaid + current.initialAmount);
      //   acc.totalPaid += current.countOverdueDebt;

      //   return acc;
      // }, { totalDebt: 0, totalPaid: 0, countOverdueDebt: 0 });

      // this._totalDebt.set( totalDebt - totalPaid );
      // this._countDebt.set( paymentIndicators.countQuotesPending );
      // this._totalPaid.set( totalPaid );
      // this._countPaid.set( paymentIndicators.countQuotesPaid );

      setTimeout(() => {
        initFlowbite();
      }, 400);

    });

  }

  onGetContractQuotesPagination( page = 1 ) {

    this._isLoading.set( true );

    listContractQuotesByClient: this._contractQuoteService.getContractQuoteByClient( page, 10, this._client()!.id )
    .subscribe( ( { contractQuotes, total, resumen } ) => {

      this._isLoading.set( false );
      this._contractQuotes.set( contractQuotes );
      this._contractQuotesTotal.set( total );

      setTimeout(() => {
        initFlowbite();
      }, 400);

    });

  }

  onSetContractQuoteToPay( quote?: ContractQuote ) {
    this._contractQuoteToPay.set( quote ?? null );
  }

  async onExonerateTardinessConfirm( contractQuote: ContractQuote ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de exonerar mora a cuota: "${ contractQuote.code }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._exonerateTardiness( contractQuote.id );
    }
  }

  private _exonerateTardiness( contractQuoteId: string ) {

    // const allowDelete = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'DELETE' )
    // );

    // if( !allowDelete ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para eliminar un Método de pago', 'warning');
    //   return;
    // }

    if( this._isRemoving() ) return;

    this._isRemoving.set( true );

    this._alertService.showLoading();

    this._contractQuoteService.exonerateTardiness( contractQuoteId )
    .subscribe({
      next: ( paymentQuoteUpdated ) => {
        this._isRemoving.set( false );
        this._alertService.showAlert('Mora exonerada exitosamente', undefined, 'success');

        this.onGetContractQuotes();

      }, error: (err) => {
        this._isRemoving.set( false );
        this._alertService.close();
      }
    });

  }

  ngOnDestroy(): void {
    this._clientProfileRx$?.unsubscribe();
    this._authrx$?.unsubscribe();
  }

}
