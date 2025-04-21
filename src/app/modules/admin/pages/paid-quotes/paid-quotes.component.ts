import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';

import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { fullTextPatt, operationCodePatt } from '@shared/helpers/regex.helper';
import { ContractService } from '../../services/contract.service';
import { Contract, ContractQuote, PaymentMethod, PaymentQuoteBody } from '../../interfaces';
import { ContractQuoteService } from '../../services/contract-quote.service';
import { PaymentMethodService } from '../../services/payment-method.service';
import { PipesModule } from '@pipes/pipes.module';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { environments } from '@envs/environments';
import { onValidImg } from '@shared/helpers/files.helper';
import { AlertService } from '@shared/services/alert.service';
import { PaymentQuoteService } from '../../services/payment-quote.service';
import { UploadFileService } from '@shared/services/upload-file.service';

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
    FlatpickrDirective
  ],
  templateUrl: './paid-quotes.component.html',
  styles: ``
})
export default class PaidQuotesComponent implements OnInit {

  @ViewChild('btnShowPaymentQuoteModal') btnShowPaymentQuoteModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnClosePaymentQuoteModal') btnClosePaymentQuoteModal!: ElementRef<HTMLButtonElement>;

  private _contractService = inject( ContractService );
  private _contractQuoteService = inject( ContractQuoteService );
  private _paymentMethodService = inject( PaymentMethodService );
  private _paymentQuoteService = inject( PaymentQuoteService );
  private _alertService = inject( AlertService );
  private _uploadService = inject( UploadFileService );

  currentDate: Date = new Date();

  private _formBuilder = inject( UntypedFormBuilder );
  public contractInput = new FormControl(null, []);
  public searchContractInput = new FormControl(null, [ Validators.pattern( fullTextPatt ) ]);

  public paymentQuoteForm = this._formBuilder.group({
    contractQuotes:    [ [],   [ Validators.required, Validators.minLength(1) ] ],
    paymentDate:       [ null, [ Validators.required ] ],
    operationCode:     [ null, [ Validators.required, Validators.pattern( operationCodePatt ) ] ],
    amount:            [ null, [ Validators.required, Validators.min(1), Validators.max(100000) ] ],
    observation:       [ '', [] ],
    paymentMethodId:   [ null, [ Validators.required ] ],
  });

  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  private _contracts = signal<Contract[]>( [] );
  private _contractQuotes = signal<ContractQuote[]>( [] );
  private _contractQuotesSelected = signal<ContractQuote[]>( [] );
  private _quotesByContractId = signal<ContractQuote[]>( [] );
  private _paymentsMethod = signal<PaymentMethod[]>( [] );
  private _contractQuotesTotal = signal<number>( 0 );
  private _totalDebt = signal<number>( 0 );
  private _allowList = signal( true );
  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isRemoving = false;

  public contracts = computed( () => this._contracts() );
  public contractQuotes = computed( () => this._contractQuotes() );
  public contractQuotesSelected = computed( () => this._contractQuotesSelected() );
  public quotesByContractId = computed( () => this._quotesByContractId() );
  public contractQuotesTotal = computed( () => this._contractQuotesTotal() );
  public totalDebt = computed( () => this._totalDebt() );
  public paymentsMethod = computed( () => this._paymentsMethod() );
  public allowList = computed( () => this._allowList() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );

  get searchInputIsTouched() {
    return this.searchContractInput?.touched ?? false;
  }

  get searchInputErrors(  ) {
    return this.searchContractInput?.errors ?? null;
  }

  inputErrors( field: string ) {
    return this.paymentQuoteForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.paymentQuoteForm.errors; }
  get file() { return this._file; }
  get isFormInvalid() { return this.paymentQuoteForm.invalid; }
  get paymentQuoteBody(): PaymentQuoteBody { return  this.paymentQuoteForm.value as PaymentQuoteBody; }

  isTouched( field: string ) {
    return this.paymentQuoteForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    initFlowbite();
    this.onGetContract();
    this.onGetPaymentsMethod();
    this.onGetContractQuotes();
  }

  onGetContract() {
    const filter = this.searchContractInput.value ?? '';

    this._contractService.getContracts( 1, filter )
    .subscribe( ({ contracts, total }) => {

      this._contracts.set( contracts );

    });
  }

  onGetPaymentsMethod( ) {

    this._paymentMethodService.getPaymentsMethod( 1, '', 100 )
    .subscribe(({ paymentsMethod, total }) => {
      this._paymentsMethod.set( paymentsMethod );
    });

  }

  onLoadPaymentQuotes( quoteToPay?: ContractQuote ) {

    if( quoteToPay ) {
      this._quotesByContractId.set([ quoteToPay ]);
      this.paymentQuoteForm.get('contractQuotes')?.setValue( [quoteToPay.id] );

      return;
    }

    const contractId = this.contractInput.value;

    this._contractQuoteService.getContractQuotes( 1, '', contractId, 100 )
    .subscribe( ({ contractQuotes, total }) => {

      this._quotesByContractId.set( contractQuotes );

    });

  }

  onGetContractQuotes( page = 1 ) {
    const contractId = this.contractInput.value;

    this._isLoading.set( true );

    this._contractQuoteService.getContractQuotes( page, '', contractId )
    .subscribe( ({ contractQuotes, total }) => {

      this._contractQuotes.set( contractQuotes );
      this._contractQuotesTotal.set( total );

      setTimeout(() => {
        initFlowbite();
      }, 400);

      this._isLoading.set( false );
    });
  }

  onChangeFile( event?: any ) {

    if( !event ) return;

    const nombre = event.files.item(0).name.toUpperCase();
    const size = event.files.item(0).size;
    const extension = nombre.split('.').pop();

    this._file = event.files.item(0);

    if ( !onValidImg(extension, size) ) {
      event.target.value = '';
      this._file = undefined;
      return
    }

    const reader = new FileReader();
    reader.onload = (event: any) => {
      this.fileUrl.set( event.target.result );
    };
    reader.readAsDataURL( event.files.item(0) );

  }

  onRemoveFile() {
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
  }

  onResetAfterSubmit() {
    this.paymentQuoteForm.reset();
    this._isSaving.set( false );
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
  }

  onUpdateSelectQuotes( contractQuotesId: string[] ) {

    const quotesSelected = this._contractQuotes().filter( (e) => contractQuotesId.includes( e.id ) );

    this._totalDebt.set( quotesSelected.reduce( (acc, current) => acc + current.totalDebt , 0 ) );

    this._contractQuotesSelected.set( quotesSelected );

    // this.btnShowPaymentQuoteModal.nativeElement?.click();

  }

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) return;

    const body = this.paymentQuoteBody;

    console.log({body});

    // const allowCreate = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'POST' )
    // );

    // if( !allowCreate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para crear un Método de pago', 'warning');
    //   return;
    // }

    this._alertService.showLoading();

    this._paymentQuoteService.createPaymentQuote( body )
      .subscribe({
        next: async ( paymentMethodCreated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, paymentMethodCreated.id, 'payment-quote' );
          }

          this.onResetAfterSubmit();
          this.btnClosePaymentQuoteModal.nativeElement.click();
          this._alertService.showAlert('Pago de cuota(s) creado exitosamente', undefined, 'success');
          this.onGetContractQuotes();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

  }

}
