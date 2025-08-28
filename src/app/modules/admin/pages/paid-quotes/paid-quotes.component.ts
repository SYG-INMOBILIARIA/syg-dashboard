import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';

import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { ContractService } from '../../services/contract.service';
import { Contract, ContractQuote, QuotesResumen } from '../../interfaces';
import { ContractQuoteService } from '../../services/contract-quote.service';
import { PaymentMethodService } from '../../services/payment-method.service';
import { PipesModule } from '@pipes/pipes.module';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { AlertService } from '@shared/services/alert.service';
import { PaidQuotesModalComponent } from '@modules/admin/components/paid-quotes-modal/paid-quotes-modal.component';
import { Subscription, forkJoin } from 'rxjs';
import { Store } from '@ngrx/store';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '@app/auth/interfaces';
import { apiPaymentQuote } from '@shared/helpers/web-apis.helper';

@Component({
  selector: 'app-paid-quotes',
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
    PaidQuotesModalComponent
  ],
  templateUrl: './paid-quotes.component.html',
  styles: ``
})
export default class PaidQuotesComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );

  @ViewChild('btnShowPaymentQuoteModal') btnShowPaymentQuoteModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnClosePaymentQuoteModal') btnClosePaymentQuoteModal!: ElementRef<HTMLButtonElement>;

  private _contractService = inject( ContractService );
  private _contractQuoteService = inject( ContractQuoteService );
  private _alertService = inject( AlertService );

  public contractInput = new FormControl(null, []);
  public searchContractInput = new FormControl(null, [ Validators.pattern( fullTextPatt ) ]);

  private _contractQuotes = signal<ContractQuote[]>( [] );

  private _quoteResumen = signal<QuotesResumen | null>( null );

  private _contracts = signal<Contract[]>( [] );
  private _webUrlPermissionMethods = signal<WebUrlPermissionMethods[]>( [] );
  private _contractQuotesSelected = signal<ContractQuote[]>( [] );
  private _contractQuotesAll = signal<ContractQuote[]>( [] );
  private _contractQuoteToPay = signal<ContractQuote | null>( null );
  private _contractQuotesTotal = signal<number>( 0 );
  private _totalDebt = signal<number>( 0 );
  private _isSaving = signal( false );

  private _allowList = signal( true );
  private _isLoading = signal( true );
  private _isRemoving = false;

  public contracts = computed( () => this._contracts() );
  public webUrlPermissionMethods = computed( () => this._webUrlPermissionMethods() );
  public contractQuotes = computed( () => this._contractQuotes() );
  public quoteResumen = computed( () => this._quoteResumen() );
  public contractQuotesSelected = computed( () => this._contractQuotesSelected() );
  public contractQuotesAll = computed( () => this._contractQuotesAll() );
  public contractQuoteToPay = computed( () => this._contractQuoteToPay() );
  public contractQuotesTotal = computed( () => this._contractQuotesTotal() );
  public totalDebt = computed( () => this._totalDebt() );
  public isSaving = computed( () => this._isSaving() );
  public allowList = computed( () => this._allowList() );
  public isLoading = computed( () => this._isLoading() );

  get searchInputIsTouched() {
    return this.searchContractInput?.touched ?? false;
  }

  get searchInputErrors(  ) {
    return this.searchContractInput?.errors ?? null;
  }

  ngOnInit(): void {
    initFlowbite();
    this.onListenAuthRx();
    this.onGetContract();
    this.onGetContractQuotes();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods.set( webUrlPermissionMethods );
    });
  }

  onGetContract() {
    const filter = this.searchContractInput.value ?? '';

    this._contractService.getContracts( 1, filter )
    .subscribe( ({ contracts, total }) => {

      this._contracts.set( contracts );

    });
  }

  onGetContractQuotes( page = 1 ) {

    const contractId = this.contractInput.value;

    this._isLoading.set( true );

    forkJoin({
      listContractQuotes: this._contractQuoteService.getContractQuotes( page, '', contractId ),
      listContractQuotesAll: this._contractQuoteService.getContractQuotes( page, '', contractId, 100 ),

    })
    .subscribe( ( { listContractQuotes, listContractQuotesAll } ) => {

      const { contractQuotes, total, resumen } = listContractQuotes;
      this._contractQuotes.set( contractQuotes );
      this._contractQuotesTotal.set( total );
      this._quoteResumen.set( resumen );

      this._contractQuotesAll.set( listContractQuotesAll.contractQuotes );

      setTimeout(() => {
        initFlowbite();
      }, 400);

      this._isLoading.set( false );
    });

  }

  onGetContractQuotesPagination( page = 1 ) {

    const contractId = this.contractInput.value;

    this._isLoading.set( true );

    this._contractQuoteService.getContractQuotes( page, '', contractId )
    .subscribe( ({ contractQuotes, total, resumen }) => {

      this._contractQuotes.set( contractQuotes );
      this._contractQuotesTotal.set( total );
      this._quoteResumen.set( resumen );

      setTimeout(() => {
        initFlowbite();
      }, 400);

      this._isLoading.set( false );
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

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
  }

}
