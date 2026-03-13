import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription, forkJoin } from 'rxjs';

import { ContractQuoteService } from '@modules/admin/services/contract-quote.service';
import { AppState } from '@app/app.config';
import { Client, Contract, ContractQuote } from '@modules/admin/interfaces';
import { initFlowbite } from 'flowbite';
import { AlertService } from '@shared/services/alert.service';
import { WebUrlPermissionMethods } from '@app/auth/interfaces';
import { ContractService } from '@modules/admin/services/contract.service';
import { UntypedFormControl, Validators } from '@angular/forms';
import { PaymentQuoteService } from '@modules/admin/services/payment-quote.service';
import { PaymentsByCuote } from '@modules/admin/pages/paid-quotes/interfaces';
import { MatDialog } from '@angular/material/dialog';
import { PaymentQuotesModalComponent } from '@modules/admin/components/payment-quotes-modal/payment-quotes-modal.component';
import { AuthService } from '@app/auth/services/auth.service';

@Component({
  templateUrl: './client-payments.component.html',
  styles: ``
})
export class ClientPaymentsComponent implements OnInit, OnDestroy {

  private _dialog$?: Subscription;
  private readonly _dialog = inject(MatDialog);

  @ViewChild('btnShowPaymentQuoteInfoModal') btnShowPaymentQuoteInfoModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowPaymentModal') btnShowPaymentModal!: ElementRef<HTMLButtonElement>;

  private _authrx$?: Subscription;
  private _clientProfileRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods = signal<WebUrlPermissionMethods[]>( [] );

  private _contractQuoteService = inject( ContractQuoteService );
  private _contractService = inject( ContractService );
  private _alertService = inject( AlertService );
  private _contractPaymentService = inject( PaymentQuoteService );
  private _authService = inject( AuthService );

  public contractInput = new UntypedFormControl( null, [ Validators.required ] )

  private _isLoading = signal<boolean>( false );
  private _allowPaidQuote = signal<boolean>( true );
  private _isRemoving = signal( false );
  private _client = signal<Client | null>( null );
  private _contracts = signal<Contract[]>( [] );
  private _contractQuotesAll = signal<ContractQuote[]>( [] );
  private _contractQuotes = signal<ContractQuote[]>( [] );
  private _contractQuoteToPay = signal<ContractQuote | null>( null );
  private _paymentsByCuote = signal<PaymentsByCuote[]>( [] );
  private _contractQuotesTotal = signal<number>( 0 );
  private _totalDebt = signal<number>( 0 );
  private _countDebt = signal<number>( 0 );
  private _totalPaid = signal<number>( 0 );
  private _countPaid = signal<number>( 0 );

  public isLoading = computed( () => this._isLoading() );
  public allowPaidQuote = computed( () => this._allowPaidQuote() );
  public webUrlPermissionMethods = computed( () => this._webUrlPermissionMethods() );
  public isRemoving = computed( () => this._isRemoving() );
  public contracts = computed( () => this._contracts() );
  public contractQuotesAll = computed( () => this._contractQuotesAll() );
  public paymentsByCuote = computed( () => this._paymentsByCuote() );
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

  ngAfterViewInit(): void {
    initFlowbite();
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

    if( this._client()!.id == this._authService.personSession()?.client?.id ) {
      this._allowPaidQuote.set( false );
    }

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

    });

  }

  onGetContractQuotesPagination( page = 1 ) {

    this._isLoading.set( true );

    this._contractQuoteService.getContractQuoteByClient( page, 10, this._client()!.id )
    .subscribe( ( { contractQuotes, total, resumen } ) => {

      this._isLoading.set( false );
      this._contractQuotes.set( contractQuotes );
      this._contractQuotesTotal.set( total );


    });

  }

  onSetContractQuoteToPay( quote?: ContractQuote ) {

    if( !this.allowPaidQuote() ) return;

    this._contractQuoteToPay.set( quote ?? null );

    // if( quote ) this._contractQuotesAll.set( [quote] );
    // this.btnShowPaymentModal.nativeElement.click();
    this.onOpenPaidCuoteModal();
  }

  onOpenPaidCuoteModal() {

    const dialogRef = this._dialog.open( PaymentQuotesModalComponent , {
      width: '50vw',
      height: '100vw',
      maxWidth: '40vw',
      // maxHeight: '100vh',
      enterAnimationDuration: '0ms',
      exitAnimationDuration: '0ms',
      closeOnNavigation: true,

      data: {
        contractQuotes: this._contractQuotesAll(),
        webUrlPermissionMethods: this._webUrlPermissionMethods(),
        contractQuoteSelected: this._contractQuoteToPay()
      }
    });

    this._dialog$ = dialogRef.afterClosed().subscribe( (paymentCuoteCreated: any | null) => {

      if (paymentCuoteCreated) {
        this.onGetContractQuotes();
      }

      this._dialog$?.unsubscribe();
    });

  }

  onShowBoucherView( contractQuote: ContractQuote ) {

  }

  onGetPaymentQuoteInfo( contractQuoteId: string ) {

    this._contractPaymentService.getPaymentQuoteByContractQuote( contractQuoteId )
    .subscribe( ( { paymentsByCuote } ) => {

      this._paymentsByCuote.set( paymentsByCuote );

      this.btnShowPaymentQuoteInfoModal.nativeElement.click();
    });

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
    this._dialog$?.unsubscribe();
  }

}
