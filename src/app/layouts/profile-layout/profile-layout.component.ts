import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { validate as ISUUID } from 'uuid';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';

import { UserService } from '../../modules/security/services/user.service';
import { User } from '../../modules/security/interfaces';
import { AppState } from '../../app.config';
import * as profileActions from '@redux/actions/profile.actions';
import { forkJoin } from 'rxjs';
import { ProfileService } from '../../profile/services/profile.service';
import { environments } from '@envs/environments';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { descriptionPatt, operationCodePatt } from '@shared/helpers/regex.helper';
import { SellerPaymentBody } from '../../profile/interfaces';
import { AlertService } from '@shared/services/alert.service';
import { SellerPaymentService } from '../../modules/admin/services/seller-payment.service';
import { UploadFileService } from '@shared/services/upload-file.service';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { onValidImg } from '@shared/helpers/files.helper';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { NgSelectModule } from '@ng-select/ng-select';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PaymentMethodService } from '../../modules/admin/services/payment-method.service';
import { PaymentMethod } from '../../modules/admin/interfaces';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'profile-layout',
  templateUrl: './profile-layout.component.html',
  styles: ``,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    FlatpickrDirective,
    NgSelectModule,
    InputErrorsDirective
  ]
})
export default class ProfileLayoutComponent implements OnInit {

  @ViewChild('btnCloseSellerPaymentModal') btnCloseSellerPaymentModal!: ElementRef<HTMLButtonElement>;

  private _router = inject( Router );
  private _userService = inject( UserService );
  private _profileService = inject( ProfileService );
  private _store = inject( Store<AppState> );

  private _paymentMethodService = inject( PaymentMethodService );
  private _alertService = inject( AlertService );
  private _sellerPaymentService = inject( SellerPaymentService );
  private _uploadService = inject( UploadFileService );

  currentDate: Date = new Date();

  private _formBuilder = inject( UntypedFormBuilder );

  public sellerPaymentLayoutForm = this._formBuilder.group({
    id:                [ 'xD',   [] ],
    sellerUserId:      [ null,   [ Validators.required ] ],
    paymentDate:       [ null, [ Validators.required ] ],
    operationCode:     [ null, [ Validators.required, Validators.pattern( operationCodePatt ) ] ],
    amount:            [ null, [ Validators.required, Validators.min(1) ] ],
    observation:       [ '',   [ Validators.pattern( descriptionPatt ) ] ],
    paymentMethodId:   [ null, [ Validators.required ] ],
  });

  private _userProfileName = signal<string | null>(null);
  private _userProfile = signal<User | null>(null);
  public defaultImg = environments.defaultImgUrl;

  private _isLoading = signal<boolean>(true);
  private _isHavePhotoUpdated = false;

  private _totalPayments = signal<number>( 0 );
  private _totalCommissions = signal<number>( 0 );
  private _totalPending = signal<number>( 0 );
  private _paymentsMethod = signal<PaymentMethod[]>( [] );

  public totalPayments = computed( () => this._totalPayments() );
  public totalCommissions = computed( () => this._totalCommissions() );
  public totalPending = computed( () => this._totalPending() );
  public paymentsMethod = computed( () => this._paymentsMethod() );

  public userProfileName = computed( () => this._userProfileName() );
  public userProfile = computed( () => this._userProfile() );
  public isLoading = computed( () => this._isLoading() );

  private _sellerUserId = '';

  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  private _isSaving = signal<boolean>( false );
  public isSaving = computed( () => this._isSaving() );
  inputErrors( field: string ) {
    return this.sellerPaymentLayoutForm.get(field)?.errors ?? null;
  }

  isTouched( field: string ) {
    return this.sellerPaymentLayoutForm.get(field)?.touched ?? false;
  }

  get isHavePhotoUpdated() { return this._isHavePhotoUpdated; }
  get formErrors() { return this.sellerPaymentLayoutForm.errors; }
  get file() { return this._file; }
  get isFormInvalid() { return this.sellerPaymentLayoutForm.invalid; }
  get sellerPaymentBody(): SellerPaymentBody { return  this.sellerPaymentLayoutForm.value as SellerPaymentBody; }

  ngOnInit(): void {

    initFlowbite();

    this._userProfileName.set( localStorage.getItem('userProfileName') );

    this._sellerUserId = localStorage.getItem('userProfileId') ?? '';

    if( !ISUUID( this._sellerUserId ) ) {
      this._router.navigateByUrl('/dashboard');
      return;
    }

    this.sellerPaymentLayoutForm.get('sellerUserId')?.setValue( this._sellerUserId );

    this.onGetUserProfile();
    this.onGetPaymentsMethod();

  }

  onGetPaymentsMethod() {

    this._paymentMethodService.getPaymentsMethod( 1, '', 100 )
    .subscribe(({ paymentsMethod, total }) => {
      this._paymentsMethod.set( paymentsMethod );
    });

  }

  onGetUserProfile() {

    forkJoin({
      userProfile: this._userService.getUserById( this._sellerUserId ),
      paymentsIndicators: this._profileService.getSellerPaymentsIndicators( this._sellerUserId ),
    }).subscribe( ({ userProfile, paymentsIndicators }) => {

      const { totalCommissions, totalPayments, lastPayment } = paymentsIndicators;
      this._isLoading.set( false );
      this._userProfile.set( userProfile );

      this._store.dispatch( profileActions.onLoadUserProfile({ userProfile: userProfile }) );
      this._store.dispatch( profileActions.onLoadPaymentIndicators({ totalCommissions, totalPayments }) );

      this._totalCommissions.set( totalCommissions );
      this._totalPayments.set( totalPayments );
      this._totalPending.set( userProfile.profits );

      this.sellerPaymentLayoutForm.get('amount')?.clearValidators();
      this.sellerPaymentLayoutForm.get('amount')?.addValidators([ Validators.required, Validators.min(1), Validators.max( userProfile.profits ) ]);
      this.sellerPaymentLayoutForm.updateValueAndValidity();

      if( lastPayment ){
        this._store.dispatch( profileActions.onLoadLastPayment({ lastPayment }) );
      }

    });
  }

  onResetAfterSubmit() {
    this.sellerPaymentLayoutForm.reset({
      sellerUserId: this._userProfile()?.id
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

    this._sellerPaymentService.createSellerPayment( body )
    .subscribe({
      next: async ( sellerPaymentCreated ) => {

        if( this._file ) {
          await this._uploadService.uploadFile( this._file, sellerPaymentCreated.id, 'seller-payments' );
        }

        this._store.dispatch( profileActions.onSubstractProfits({ amount: sellerPaymentCreated.amount }) );
        this._store.dispatch( profileActions.onLoadLastPayment({ lastPayment: sellerPaymentCreated }) );


        this._totalPayments.update( (val) => val += sellerPaymentCreated.amount );
        this._totalPending.update( (val) => val -= sellerPaymentCreated.amount );

        this.onResetAfterSubmit();
        this.btnCloseSellerPaymentModal.nativeElement.click();
        this._alertService.showAlert('Pago a vendedor creado exitosamente', undefined, 'success');

      }, error: (err) => {
        this._isSaving.set( false);
      }
    });

  }

  onRemoveFile() {
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
  }


}
