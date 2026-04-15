import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';
import { validate as ISUUID } from 'uuid';

import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { ContractService } from '../../services/contract.service';
import { Contract, ContractQuote, QuotesResumen } from '../../interfaces';
import { ContractQuoteService } from '../../services/contract-quote.service';
import { PipesModule } from '@pipes/pipes.module';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { AlertService } from '@shared/services/alert.service';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '@app/auth/interfaces';
import { apiPaymentQuote } from '@shared/helpers/web-apis.helper';
import { PaymentQuoteService } from '@modules/admin/services/payment-quote.service';
import { PaymentQuote, PaymentQuoteDetail, PaymentsByCuote } from './interfaces';
import { MatDialog } from '@angular/material/dialog';
import { PaymentQuotesModalComponent } from '@modules/admin/components/payment-quotes-modal/payment-quotes-modal.component';
import { Quote } from '@app/dashboard/interfaces';

type PaidQuotesTab = 'pending' | 'paid';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    PaginationComponent,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    InputErrorsDirective,
    PipesModule,
    SpinnerComponent,
  ],
  // providers: [
  //   PaidQuotesModalComponent
  // ],
  templateUrl: './paid-quotes.component.html',
  styles: ``
})
export default class PaidQuotesComponent implements OnInit, OnDestroy {

  private _dialog$?: Subscription;
  private readonly _dialog = inject(MatDialog);

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );

  @ViewChild('btnClosePaymentQuoteModal') btnClosePaymentQuoteModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowPaymentQuoteInfoModal') btnShowPaymentQuoteInfoModal!: ElementRef<HTMLButtonElement>;

  private _contractService = inject( ContractService );
  private _contractQuoteService = inject( ContractQuoteService );
  private _contractPaymentService = inject( PaymentQuoteService );
  private _alertService = inject( AlertService );

  public contractInput = new UntypedFormControl( null, [ Validators.required ]);
  public searchContractInput = new UntypedFormControl(null, [ Validators.pattern( fullTextPatt ) ]);
  public chkExpiredQuotesInput = new UntypedFormControl(false, []);

  private _contractQuotes = signal<ContractQuote[]>( [] );

  private _quoteResumen = signal<QuotesResumen | null>( null );

  private _contracts = signal<Contract[]>( [] );
  private _webUrlPermissionMethods = signal<WebUrlPermissionMethods[]>( [] );
  private _contractQuotesSelected = signal<ContractQuote[]>( [] );
  private _contractQuotesAll = signal<ContractQuote[]>( [] );
  private _paymentsByCuote = signal<PaymentsByCuote[]>( [] );
  private _paymentsQuote = signal<PaymentQuote[]>( [] );
  private _contractQuoteToPay = signal<ContractQuote | null>( null );
  private _contractQuotesTotal = signal<number>( 0 );
  private _totalDebt = signal<number>( 0 );
  private _totalPaymentQuote = signal<number>( 0 );
  private _isSaving = signal( false );

  private _allowList = signal( true );
  private _isLoading = signal( true );
  private _isLoadingPayments = signal( true );
  private _isLoadingContract = signal( true );
  private _isRemoving = false;

  public contracts = computed( () => this._contracts() );
  public webUrlPermissionMethods = computed( () => this._webUrlPermissionMethods() );
  public contractQuotes = computed( () => this._contractQuotes() );
  public quoteResumen = computed( () => this._quoteResumen() );
  public contractQuotesSelected = computed( () => this._contractQuotesSelected() );
  public contractQuotesAll = computed( () => this._contractQuotesAll() );
  public paymentsByCuote = computed( () => this._paymentsByCuote() );
  public paymentsQuote = computed( () => this._paymentsQuote() );
  public contractQuoteToPay = computed( () => this._contractQuoteToPay() );
  public contractQuotesTotal = computed( () => this._contractQuotesTotal() );
  public totalDebt = computed( () => this._totalDebt() );
  public totalPaymentQuote = computed( () => this._totalPaymentQuote() );
  public isSaving = computed( () => this._isSaving() );
  public allowList = computed( () => this._allowList() );
  public isLoading = computed( () => this._isLoading() );
  public isLoadingPayments = computed( () => this._isLoadingPayments() );
  public isLoadingContract = computed( () => this._isLoadingContract() );

  get searchInputIsTouched() { return this.searchContractInput.touched; }
  get searchInputErrors() { return this.searchContractInput.errors; }

  get contractInputIsTouched() { return this.contractInput.touched; }
  get contractInputErrors() { return this.contractInput.errors; }
  get contractInputIsInvalid() { return this.contractInput.invalid;}

  private _activeTab = signal<PaidQuotesTab>('pending');

  public activeTab = computed(() => this._activeTab());

  public pendingContractQuotes = computed(() =>
    this._contractQuotes().filter((quote) => !quote.isPaid)
  );

  public paidContractQuotes = computed(() =>
    this._contractQuotes().filter((quote) => quote.isPaid)
  );

  public pendingContractQuotesTotal = computed(() => this.pendingContractQuotes().length);
  public paidContractQuotesTotal = computed(() => this.paidContractQuotes().length);

  private _currentPage = 1;

  ngOnInit(): void {
    // initFlowbite();
    this.onLoadPermissions();
    this.onGetContract();
    this.onGetContractQuotes();
    this.onGetPaymentQuotes()

  }

  isPdf(fileUrl: string): boolean {
    if (!fileUrl) return false;

    return /(\.pdf|%2F[^?#]+\.pdf)(?=($|[?#]))/i.test(fileUrl);
  }



  ngAfterViewInit(): void {
    setTimeout(() => {
      initFlowbite();
    }, 400);
  }

  onGetQuoteByDetail( quotes: Quote[], detail: PaymentQuoteDetail ) {
    return quotes.find( (q) => q.id == detail.contractQuoteId )?.order;
  }

  onChangeTab(tab: PaidQuotesTab) {
    this._activeTab.set(tab);
  }

  onLoadPermissions() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods.set( webUrlPermissionMethods );
    });
  }

  onGetContract() {
    const clientPattern = this.searchContractInput.value ?? '';
    const chkExpiredQuotes = this.chkExpiredQuotesInput.value ?? '';

    const filter = `clientPattern=${clientPattern};expiredQuotes=${chkExpiredQuotes}`;
    this._isLoadingContract.set( true );
    this._contractService.getContracts( 1, filter )
    .subscribe( ({ contracts, total }) => {

      this._contracts.set( contracts );
      this._isLoadingContract.set( false );

    });
  }

  onGetContractQuotes( page = 1 ) {

    this._currentPage = page;
    const contractId = this.contractInput.value;

    this._isLoading.set( true );
    this._alertService.showLoading();

    this._contractQuoteService.getContractQuotes( page, '', contractId )
    .subscribe( ( { contractQuotes, total, resumen } ) => {

      this._contractQuotes.set( contractQuotes );
      this._contractQuotesTotal.set( total );
      this._quoteResumen.set( resumen );

      this._alertService.close();
      this._isLoading.set( false );

      // setTimeout(() => {
      //   initFlowbite();
      // }, 400);

    });

  }

  onGetPaymentQuotes( page = 1 ) {

    this._isLoadingPayments.set( true );

    const contractId = this.contractInput.value;
    let filter = '';

    if(  ISUUID( contractId ) ) filter = `contractId=${contractId}`;

    this._contractPaymentService.getPaymentQuotes( page, filter, 'createAt=DESC' )
    .subscribe( ( response ) => {

      this._paymentsQuote.set( response.paymentQuotes );
      this._totalPaymentQuote.set( response.total );
      this._isLoadingPayments.set( false );

    });

  }

  onGetQuotesToSelect() {

    const contractId = this.contractInput.value;

    this._contractQuoteService.getContractQuotes( 1, '', contractId, 100, true )
    .subscribe( ( { contractQuotes } ) => {
      this._contractQuotesAll.set( contractQuotes );
    });

  }

  onGetQuotesByContract() {

    this.onGetContractQuotes();
    this.onGetQuotesToSelect();
    this.onGetPaymentQuotes();

  }

  onSetContractQuoteToPay( quote?: ContractQuote ) {
    this._contractQuoteToPay.set( quote ?? null );

    this.onOpenPaidCuoteModal();
  }

  onGetPaymentQuoteInfo( contractQuoteId: string ) {

    this._contractPaymentService.getPaymentQuoteByContractQuote( contractQuoteId )
    .subscribe( ( { paymentsByCuote } ) => {

      if( Object.keys(paymentsByCuote).length === 0 ){
        this._alertService.showAlert( undefined, 'Esta cuota ha sido pagada en la creación del contraro', 'info' );
        return;
      }

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

    const allowUpdate = this._webUrlPermissionMethods().some(
      (permission) => permission.webApi == apiPaymentQuote && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para exonerar mora', 'warning');
      return;
    }

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._contractQuoteService.exonerateTardiness( contractQuoteId )
    .subscribe({
      next: (contractQuoteUpdated) => {
        this.onGetContractQuotes();
        this._isRemoving = false;
        this._alertService.showAlert('Mora exonerada exitosamente', undefined, 'success');

      }, error: (err) => {
        this._isRemoving = false;
        this._alertService.close();
      }
    });

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
        contractQuotes: this._contractQuotesAll().filter( (p) => !p.isPaid ),
        webUrlPermissionMethods: this._webUrlPermissionMethods(),
        contractQuoteSelected: this._contractQuoteToPay()
      }
    });

    this._dialog$ = dialogRef.afterClosed().subscribe( (paymentCuoteCreated: any | null) => {

      if (paymentCuoteCreated) {
        this.onGetContractQuotes( this._currentPage );
        this.onGetQuotesToSelect();
        this.onGetPaymentQuotes();
      }

      this._dialog$?.unsubscribe();
    });

  }

  async onRemoveConfirm( paymentQuote: PaymentQuote ) {

    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar pago de cuota(s) ${ paymentQuote.quotes.map(q => q.order ).join(', ') }?`
    );

    if( responseConfirm.isConfirmed ) {
      this._onRemovePaymentQuote( paymentQuote.id );
    }

  }

  private _onRemovePaymentQuote( paymentQuoteId: string ) {

    this._alertService.showLoading();
    this._contractPaymentService.onRemove( paymentQuoteId )
    .subscribe( (visitDeleted) => {
      this._alertService.close();
      this.onGetContractQuotes( this._currentPage );
      this.onGetQuotesToSelect();
      this.onGetPaymentQuotes();
      this._alertService.showAlert(`Pago eliminado exitosamente`, undefined, 'success');

    });

  }

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
    this._dialog$?.unsubscribe();
  }

}
