import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription, forkJoin } from 'rxjs';

import { ContractQuoteService } from '@modules/admin/services/contract-quote.service';
import { AppState } from '@app/app.config';
import { Client, Contract, ContractQuote } from '@modules/admin/interfaces';
import { initFlowbite } from 'flowbite';
import { AlertService } from '@shared/services/alert.service';
import { ProfileClientService } from '@app/dashboard/services/profile-client.service';
import { WebUrlPermissionMethods } from '@app/auth/interfaces';
import { ContractService } from '@modules/admin/services/contract.service';
import { UntypedFormControl, Validators } from '@angular/forms';

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
  private _contractService = inject( ContractService );
  private _alertService = inject( AlertService );

  public contractInput = new UntypedFormControl( null, [ Validators.required ] )

  private _isLoading = signal<boolean>( false );
  private _isRemoving = signal( false );
  private _client = signal<Client | null>( null );
  private _contracts = signal<Contract[]>( [] );
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
  public contracts = computed( () => this._contracts() );
  public contractQuotesAll = computed( () => this._contractQuotesAll() );
  public contractQuotes = computed( () => this._contractQuotes() );
  public contractQuoteToPay = computed( () => this._contractQuoteToPay() );
  public contractQuotesTotal = computed( () => this._contractQuotesTotal() );
  public totalDebt = computed( () => this._totalDebt() );
  public countDebt = computed( () => this._countDebt() );
  public totalPaid = computed( () => this._totalPaid() );
  public countPaid = computed( () => this._countPaid() );

  get contractInputIsTouched() {
    return this.contractInput?.touched ?? false;
  }

  get contractInputErrors(  ) {
    return this.contractInput?.errors ?? null;
  }

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
        this.onGetContractsByClient();
      }

    });

  }

  onGetContractsByClient() {

    if( !this._client() ) throw new Error('Client undefined!!!');

    const clientId = this._client()!.id;

    this._contractService.getContractsByClient( clientId )
    .subscribe( ({contracts}) => {
      this._contracts.set( contracts );
    })

  }

  onChangeContractSelected( contract: Contract ) {
    this.onGetAllContractQuotes( contract.id );
    this.onGetContractQuotes();
  }

  onGetAllContractQuotes( contractId: string ) {

    if( !this._client() ) throw new Error('Client undefined!!!');

    const clientId = this._client()!.id;

    this._alertService.showLoading();

    this._contractQuoteService.getContractQuoteByClient( 1, 100, clientId, undefined, undefined, contractId )
    .subscribe( ({ contractQuotes, resumen }) => {

      console.log( {contractQuotes} );

      this._contractQuotesAll.set( contractQuotes.filter( (c) => !c.isPaid ) );

      const countDebt = contractQuotes.filter( (c) => !c.isPaid ).length;
      const countPait = contractQuotes.filter( (c) => c.isPaid ).length;

      this._totalDebt.set( resumen.totalDebt );
      this._countDebt.set( countDebt );
      this._totalPaid.set( resumen.totalPaid );
      this._countPaid.set( countPait );

      this._alertService.close();

    });

  }

  onGetContractQuotes( page = 1 ) {

    if( !this._client() ) throw new Error('Client undefined!!!');

    const clientId = this._client()!.id;

    const contractId = this.contractInput.value;

    this._isLoading.set( true );

    this._contractQuoteService.getContractQuoteByClient( page, 10, clientId, undefined, undefined, contractId )
    .subscribe( ({ contractQuotes, total } ) => {

      this._isLoading.set( false );
      this._contractQuotes.set( contractQuotes );
      this._contractQuotesTotal.set( total );

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

  onShowBoucherView( contractQuote: ContractQuote ) {

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
