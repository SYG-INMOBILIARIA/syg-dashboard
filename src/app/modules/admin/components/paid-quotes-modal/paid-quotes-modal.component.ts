import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { initFlowbite } from 'flowbite';

import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { descriptionPatt, operationCodePatt } from '@shared/helpers/regex.helper';
import { environments } from '@envs/environments';
import { ContractQuote, PaymentMethod, PaymentQuoteBody } from '@modules/admin/interfaces';
import { onValidImg } from '@shared/helpers/files.helper';
import { PaymentMethodService } from '@modules/admin/services/payment-method.service';
import { AlertService } from '@shared/services/alert.service';
import { UploadFileService } from '@shared/services/upload-file.service';
import { ContractQuoteService } from '@modules/admin/services/contract-quote.service';
import { PaymentQuoteService } from '@modules/admin/services/payment-quote.service';
import { PipesModule } from '@pipes/pipes.module';

@Component({
  selector: 'paid-quotes-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    InputErrorsDirective,
    SpinnerComponent,
    FlatpickrDirective,
    PipesModule
  ],
  templateUrl: './paid-quotes-modal.component.html',
  styles: ``
})
export class PaidQuotesModalComponent implements OnInit {

  @ViewChild('btnShowPaymentQuoteModal') btnShowPaymentQuoteModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnClosePaymentQuoteModal') btnClosePaymentQuoteModal!: ElementRef<HTMLButtonElement>;

  @Output() paidQuoteSuccess = new EventEmitter<any>();

  @Input({ required: true }) set contractQuotesData( value: ContractQuote[] ) {
    this._contractQuotes.set( value );
  }

  @Input({ required: true }) set contractQuotesToPaid( value: ContractQuote | null ) {

    if( value ) {
      this._isReadOnly.set( true );

      this.paymentQuoteForm.reset({
        contractQuotes: [ value.id ]
      });
    } else {
      this._isReadOnly.set( false );
      this.paymentQuoteForm.reset();
    }

  }

  currentDate: Date = new Date();

  private _formBuilder = inject( UntypedFormBuilder );
  private _paymentMethodService = inject( PaymentMethodService );
  private _contractQuoteService = inject( ContractQuoteService );
  private _paymentQuoteService = inject( PaymentQuoteService );

  private _alertService = inject( AlertService );
  private _uploadService = inject( UploadFileService );

  public paymentQuoteForm = this._formBuilder.group({
    contractQuotes:    [ [],   [ Validators.required, Validators.minLength(1) ] ],
    paymentDate:       [ null, [ Validators.required ] ],
    operationCode:     [ null, [ Validators.required, Validators.pattern( operationCodePatt ) ] ],
    amount:            [ null, [ Validators.required, Validators.min(1) ] ],
    observation:       [ '',   [ Validators.pattern( descriptionPatt ) ] ],
    paymentMethodId:   [ null, [ Validators.required ] ],
  });

  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  private _contractQuotes = signal<ContractQuote[]>( [] );
  private _contractQuotesSelected = signal<ContractQuote[]>( [] );
  private _paymentsMethod = signal<PaymentMethod[]>( [] );
  private _contractQuotesTotal = signal<number>( 0 );
  private _totalDebt = signal<number>( 0 );
  private _isSaving = signal( false );

  private _isReadOnly = signal( false );

  public contractQuotes = computed( () => this._contractQuotes() );
  public contractQuotesSelected = computed( () => this._contractQuotesSelected() );
  public contractQuotesTotal = computed( () => this._contractQuotesTotal() );
  public totalDebt = computed( () => this._totalDebt() );
  public isSaving = computed( () => this._isSaving() );
  public isReadOnly = computed( () => this._isReadOnly() );
  public paymentsMethod = computed( () => this._paymentsMethod() );

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
    this.onGetPaymentsMethod();

  }

  onGetPaymentsMethod( ) {

    this._paymentMethodService.getPaymentsMethod( 1, '', 100 )
    .subscribe(({ paymentsMethod, total }) => {
      this._paymentsMethod.set( paymentsMethod );
    });

  }

  onResetAfterSubmit() {
    this.paymentQuoteForm.reset();
    this._isSaving.set( false );
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
    this._contractQuotesSelected.set([]);
    this._totalDebt.set( 0 );
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

  onUpdateSelectQuotes( contractQuotesId: string[] ) {

    const quotesSelected = this._contractQuotes().filter( (e) => contractQuotesId.includes( e.id ) );
    const totalDebt = quotesSelected.reduce( (acc, current) => acc + current.totalDebt , 0 );
    this._totalDebt.set( totalDebt );

    this._contractQuotesSelected.set( quotesSelected );

    this.paymentQuoteForm.get('amount')?.setValue(0);
    this.paymentQuoteForm.get('amount')?.clearValidators();
    this.paymentQuoteForm.get('amount')?.addValidators( [ Validators.required, Validators.min(1), Validators.max( parseFloat( totalDebt.toFixed(2) ) ) ] );
    this.paymentQuoteForm.updateValueAndValidity();

  }

  onRemoveFile() {
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
  }

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) {
      this.paymentQuoteForm.markAllAsTouched();
      return;
    };

    const body = this.paymentQuoteBody;

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
        next: async ( paymentQuoteCreated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, paymentQuoteCreated.id, 'payment-quote' );
          }

          this.onResetAfterSubmit();
          this.btnClosePaymentQuoteModal.nativeElement.click();
          this._alertService.showAlert('Pago de cuota(s) creado exitosamente', undefined, 'success');

          // FIXME: emitir evento a los padres
          this.paidQuoteSuccess.emit( paymentQuoteCreated );

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

  }



}
