import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { validate as ISUUID } from 'uuid';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { NgSelectModule } from '@ng-select/ng-select';
import { initFlowbite } from 'flowbite';
import { Store } from '@ngrx/store';
import * as profileActions from '@redux/actions/profile.actions';

import { descriptionPatt, fullTextPatt, operationCodePatt } from '@shared/helpers/regex.helper';
import { AlertService } from '@shared/services/alert.service';
import { environments } from '@envs/environments';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { onValidImg } from '@shared/helpers/files.helper';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { PipesModule } from '@pipes/pipes.module';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { UploadFileService } from '@shared/services/upload-file.service';
import { SellerPaymentService } from '@modules/admin/services/seller-payment.service';
import PaymentIndicatorsComponent from '../../components/payment-indicators/payment-indicators.component';
import { PaymentMethodService } from '@modules/admin/services/payment-method.service';
import { SellerPayment, SellerPaymentBody } from '../../interfaces';
import { PaymentMethod } from '@modules/admin/interfaces';
import { Subscription } from 'rxjs';
import { AppState } from '@app/app.config';

@Component({
  selector: 'app-payment-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaymentIndicatorsComponent,
    InputErrorsDirective,
    SpinnerComponent,
    PaginationComponent,
    PipesModule,
    FlatpickrDirective,
    NgSelectModule
  ],
  templateUrl: './payment-profile.component.html',
  styles: ``
})
export default class PaymentProfileComponent implements OnInit, OnDestroy {

  private _profileRx$?: Subscription;

  @ViewChild('btnCloseSellerPaymentModal') btnCloseSellerPaymentModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowSellerPaymentModal') btnShowSellerPaymentModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowVoucherModal') btnShowVoucherModal!: ElementRef<HTMLButtonElement>;

  private _alertService = inject( AlertService );
  private _sellerPaymentService = inject( SellerPaymentService );
  private _uploadService = inject( UploadFileService );
  private _paymentMethodService = inject( PaymentMethodService );
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _userSellerId = '';
  currentDate: Date = new Date();

  private _formBuilder = inject( UntypedFormBuilder );

  public sellerPaymentForm = this._formBuilder.group({
    id:                [ 'xD',   [] ],
    sellerUserId:      [ null,   [ Validators.required ] ],
    paymentDate:       [ null, [ Validators.required ] ],
    operationCode:     [ null, [ Validators.required, Validators.pattern( operationCodePatt ) ] ],
    amount:            [ null, [ Validators.required, Validators.min(1) ] ],
    observation:       [ '',   [ Validators.pattern( descriptionPatt ) ] ],
    paymentMethodId:   [ null, [ Validators.required ] ],
  });

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _isSaving = signal<boolean>( false );
  private _isLoading = signal<boolean>( false );

  private _sellerPayments = signal<SellerPayment[]>( [] );
  private _sellerPaymentsTotal = signal<number>( 0 );
  private _paymentsMethod = signal<PaymentMethod[]>( [] );
  private _totalDebt = signal<number>( 0 );
  private _totalPayments = signal<number>( 0 );
  private _totalCommissions = signal<number>( 0 );
  private _totalPending = signal<number>( 0 );

  private _isHavePhotoUpdated = false;

  public isSaving = computed( () => this._isSaving() );
  public isLoading = computed( () => this._isLoading() );
  public totalPayments = computed( () => this._totalPayments() );
  public totalCommissions = computed( () => this._totalCommissions() );
  public totalPending = computed( () => this._totalPending() );

  public sellerPayments = computed( () => this._sellerPayments() );
  public sellerPaymentsTotal = computed( () => this._sellerPaymentsTotal() );
  public paymentsMethod = computed( () => this._paymentsMethod() );
  public totalDebt = computed( () => this._totalDebt() );

  public fileUrl = signal( environments.defaultImgUrl );
  public voucherUrl = signal<string | null>( null );
  private _file?: File;
  private _isLoadedVoucher = signal( false );
  public isLoadedVoucher = computed( () => this._isLoadedVoucher() );

  inputErrors( field: string ) {
    return this.sellerPaymentForm.get(field)?.errors ?? null;
  }

  get isHavePhotoUpdated() { return this._isHavePhotoUpdated; }
  get formErrors() { return this.sellerPaymentForm.errors; }
  get file() { return this._file; }
  get isFormInvalid() { return this.sellerPaymentForm.invalid; }
  get sellerPaymentBody(): SellerPaymentBody { return  this.sellerPaymentForm.value as SellerPaymentBody; }

  isTouched( field: string ) {
    return this.sellerPaymentForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {



    this._userSellerId = localStorage.getItem('userProfileId') ?? '';

    if( !ISUUID( this._userSellerId ) )
      throw new Error('userProfileId not found !!!');

    this.sellerPaymentForm.get('sellerUserId')?.setValue( this._userSellerId );
    this.onGetSellerPayments();
    this.onGetPaymentsMethod();
    this.onListenProfileRx();

  }

  onListenProfileRx() {
    this._profileRx$ = this._store.select('profile')
    .subscribe( ( { profits, totalCommissions, totalPayments } ) => {
      this._totalPending.set( profits );
      this._totalCommissions.set( totalCommissions );
      this._totalPayments.set( totalPayments );

      // this.sellerPaymentForm.get('amount');
      this.sellerPaymentForm.get('amount')?.clearValidators();
      this.sellerPaymentForm.get('amount')?.addValidators([ Validators.required, Validators.min(1), Validators.max( profits ) ]);
      this.sellerPaymentForm.updateValueAndValidity();
    });
  }

  onGetSellerPayments( page = 1 ) {

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._sellerPaymentService.getSellerPayments( page, filter, 5, this._userSellerId )
    .subscribe({
      next: ({ sellerPayments, total }) => {

        this._sellerPaymentsTotal.set( total );
        this._sellerPayments.set( sellerPayments );
        this._isLoading.set( false );

        setTimeout(() => {
          initFlowbite();
        }, 400);

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onGetPaymentsMethod() {

    this._paymentMethodService.getPaymentsMethod( 1, '', 100 )
    .subscribe(({ paymentsMethod, total }) => {
      this._paymentsMethod.set( paymentsMethod );
    });

  }

  onResetAfterSubmit() {
    this.sellerPaymentForm.reset({
      sellerUserId: this._userSellerId
    });
    this._isSaving.set( false );
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
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

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) return;

    const { id, ...body } = this.sellerPaymentBody;

    // const allowCreate = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'POST' )
    // );

    // if( !allowCreate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para crear un Método de pago', 'warning');
    //   return;
    // }

    this._alertService.showLoading();

    this._isSaving.set( true );

    if( !ISUUID( id ) ) {

      this._sellerPaymentService.createSellerPayment( body )
      .subscribe({
        next: async ( sellerPaymentCreated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, sellerPaymentCreated.id, 'seller-payments' );
          }

          this._store.dispatch( profileActions.onSubstractProfits({ amount: sellerPaymentCreated.amount }) );
          this._store.dispatch( profileActions.onLoadLastPayment({ lastPayment: sellerPaymentCreated }) );

          this.onResetAfterSubmit();
          this.btnCloseSellerPaymentModal.nativeElement.click();
          this._alertService.showAlert('Pago a vendedor creado exitosamente', undefined, 'success');
          this.onGetSellerPayments();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

      return;
    }

    // const allowUpdate = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'PATCH' )
    // );

    // if( !allowUpdate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un Método de pago', 'warning');
    //   return;
    // }

    this._sellerPaymentService.updateSellerPayment( id ?? 'xD', body )
      .subscribe({
        next: async ( sellerPaymentUpdated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, sellerPaymentUpdated.id, 'seller-payments' );
          }

          this.onResetAfterSubmit();
          this.btnCloseSellerPaymentModal.nativeElement.click();
          this.onGetSellerPayments();

          this._alertService.showAlert('Pago a vendedor actualizado exitosamente', undefined, 'success');

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

  }

  onViewVoucher( sellerPayment: SellerPayment ) {

    this._sellerPaymentService.getSellerPaymentById( sellerPayment.id )
    .subscribe( ( sellerPayment ) => {
      this.voucherUrl.set( sellerPayment.photo?.urlImg ?? environments.defaultImgUrl );

    } );

  }

  onLoadedVoucher() {
    this._isLoadedVoucher.set( true );
  }

  ngOnDestroy(): void {
    this._profileRx$?.unsubscribe();
  }

}
