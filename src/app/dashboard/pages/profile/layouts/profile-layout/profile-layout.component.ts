import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { validate as ISUUID } from 'uuid';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin, Subscription } from 'rxjs';
import { initFlowbite } from 'flowbite';

import { UserService } from '@modules/security/services/user.service';
import { User, UserBody } from '@modules/security/interfaces';
import { SellerPaymentService } from '@modules/admin/services/seller-payment.service';
import { PaymentMethodService } from '@modules/admin/services/payment-method.service';
import { IdentityDocument, PaymentMethod } from '@modules/admin/interfaces';
import { AppState } from '@app/app.config';
import * as profileActions from '@redux/actions/profile.actions';
import { environments } from '@envs/environments';
import { datePatt, descriptionPatt, emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, operationCodePatt } from '@shared/helpers/regex.helper';
import { AlertService } from '@shared/services/alert.service';
import { UploadFileService } from '@shared/services/upload-file.service';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { onValidImg } from '@shared/helpers/files.helper';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { ProfileService } from '../../services/profile.service';
import { SellerPaymentBody } from '../../interfaces';
import { UserValidatorService } from '@modules/security/validators/user-validator.service';
import { IdentityDocumentService } from '@modules/admin/services/identity-document.service';

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
export default class ProfileLayoutComponent implements OnInit, OnDestroy {

  @ViewChild('btnCloseSellerPaymentModal') btnCloseSellerPaymentModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnCloseUserModal') btnCloseUserModal!: ElementRef<HTMLButtonElement>;

  private _authRx$?: Subscription;
  private _router = inject( Router );
  private _userService = inject( UserService );
  private _profileService = inject( ProfileService );
  private _store = inject<Store<AppState>>( Store<AppState> );

  private _paymentMethodService = inject( PaymentMethodService );
  private _alertService = inject( AlertService );
  private _sellerPaymentService = inject( SellerPaymentService );
  private _uploadService = inject( UploadFileService );
  private _userValidatorService = inject( UserValidatorService );
  private _identityDocService = inject( IdentityDocumentService );
  private _uploadFileService = inject( UploadFileService );

  maxBirthDate: Date = new Date(2005, 12, 31 );
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

  public userForm = this._formBuilder.group({
    id:                 [ '', [] ],
    name:               [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    surname:            [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    email:              [ '', [ Validators.required, Validators.pattern( emailPatt ) ] ],
    rolesId:            [ [], [ Validators.required, Validators.minLength(1) ] ],
    identityDocumentId: [ null, [ Validators.required ] ],
    identityNumber:     [ '', [ Validators.required ] ],
    address:            [ '', [ Validators.pattern( fullTextPatt ) ] ],
    birthDate:          [ null, [ Validators.pattern( datePatt ) ] ],
    admissionDate:      [ null, [ Validators.pattern( datePatt ) ] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._userValidatorService ],
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
  private _identityDocuments = signal<IdentityDocument[]>( [] );

  public totalPayments = computed( () => this._totalPayments() );
  public totalCommissions = computed( () => this._totalCommissions() );
  public totalPending = computed( () => this._totalPending() );
  public paymentsMethod = computed( () => this._paymentsMethod() );

  public userProfileName = computed( () => this._userProfileName() );
  public userProfile = computed( () => this._userProfile() );
  public isLoading = computed( () => this._isLoading() );
  public readonly identityDocuments = computed( () => this._identityDocuments() );

  private _sellerUserId = '';

  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  public fileAvatarUrl = signal( environments.defaultImgUrl );
  private _fileAvatar?: File;

  private _isSaving = signal<boolean>( false );
  public isSaving = computed( () => this._isSaving() );
  inputErrors( field: string ) {
    return this.sellerPaymentLayoutForm.get(field)?.errors ?? null;
  }

  isTouched( field: string ) {
    return this.sellerPaymentLayoutForm.get(field)?.touched ?? false;
  }

  get userBody(): UserBody{ return  this.userForm.value as UserBody; }

  get isHavePhotoUpdated() { return this._isHavePhotoUpdated; }
  get formErrors() { return this.sellerPaymentLayoutForm.errors; }
  get file() { return this._file; }
  get isFormInvalid() { return this.sellerPaymentLayoutForm.invalid; }
  get isFormInvalidProfile() { return this.userForm.invalid; }
  get sellerPaymentBody(): SellerPaymentBody { return  this.sellerPaymentLayoutForm.value as SellerPaymentBody; }

  ngOnInit(): void {
    initFlowbite();
    this.onListenAuthRx();
  }

  onListenAuthRx() {

    this._authRx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { userAuthenticated } = state;

      // this._userProfileName.set( localStorage.getItem('userProfileName') );
      this._sellerUserId = localStorage.getItem('userProfileId') ?? '';


      if( !ISUUID( this._sellerUserId ) ) {

        this._userProfileName.set( userAuthenticated?.fullname ?? null );
        this._sellerUserId = userAuthenticated?.id ?? '';

      } else {
        this._userProfileName.set( localStorage.getItem('userProfileName') );
      }

      // if( !userAuthenticated ){
      //   this._authRx$?.unsubscribe();
      //   throw new Error('User authenticated is null !!!');
      // }

      this.sellerPaymentLayoutForm.get('sellerUserId')?.setValue( this._sellerUserId );

      this.onGetUserProfile();
      this.onLoadSelectsData();
      this._authRx$?.unsubscribe();

    });
  }

  onLoadSelectsData() {

    forkJoin({
      identityDocumentsResponse: this._identityDocService.getIdentityDocuments(),
      paymentMethodsResponse: this._paymentMethodService.getPaymentsMethod( 1, '', 100 )
    })
    .subscribe(({ identityDocumentsResponse, paymentMethodsResponse }) => {

      this._identityDocuments.set( identityDocumentsResponse.identityDocuments );
      this._paymentsMethod.set( paymentMethodsResponse.paymentsMethod  );

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

  // functions para editar perfil

  onLoadEditProfile() {

    this._alertService.showLoading();

    this._userService.getUserById( this._sellerUserId )
    .subscribe({
      next: (role) => {

        const { createAt, isActive, userCreate, photo, roles, identityDocument, ...rest } = role;

        this.fileAvatarUrl.set( photo?.urlImg ?? environments.defaultImgUrl );
        this.userForm.reset( {
          ...rest,
          identityDocumentId: identityDocument.id,
          rolesId: roles.map( (role) => role.id )
        } );
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    });

  }

  onChangeIdentityDocument( identityDocument: IdentityDocument ) {

    const { longitude, isAlphaNumeric, isLongitudeExact } = identityDocument;

    this.userForm.get('identityNumber')?.clearValidators();
    this.userForm.get('identityNumber')?.addValidators( [
      Validators.required,
      Validators.pattern( isAlphaNumeric ? numberDocumentPatt : numberPatt ),
      Validators.minLength( isLongitudeExact ? longitude : 6 ),
      Validators.maxLength( longitude ),
    ] );

    this.userForm.updateValueAndValidity();
  }

  onResetUserForm() {
    this.userForm.reset();
    this.btnCloseUserModal.nativeElement.click();
    this.fileAvatarUrl.set( environments.defaultImgUrl );
    this._fileAvatar = undefined;
  }

  onSubmitProfile() {

    if( this.isFormInvalidProfile || this._isLoading() ){
      this.userForm.markAllAsTouched();
      return;
    }

    const { id = 'xD', ...body } = this.userBody;

    if( !ISUUID( id ) ) throw new Error('User ID is invalid');

    this._isLoading.set( true );

    this._userService.updateUser( id, body )
      .subscribe({
        next: async ( userUpdated ) => {

          if( this._fileAvatar ) {
            await this._uploadFileService.uploadFile( this._fileAvatar, userUpdated.id, 'users' );
          }

          this.onResetAfterSubmit();
          this.onGetUserProfile();
          this.btnCloseUserModal.nativeElement.click();
          this._isLoading.set( false );

          this._alertService.showAlert('Perfil actualizado exitosamente', undefined, 'success');

        }, error: (err) => {

          this._isLoading.set( false );
        }
      });
  }

  ngOnDestroy(): void {
    this._authRx$?.unsubscribe();
  }

}
