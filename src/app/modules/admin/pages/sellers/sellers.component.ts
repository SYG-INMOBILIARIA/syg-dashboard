import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Component, inject, OnInit, OnDestroy, ElementRef, ViewChild, signal, computed } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { validate as ISUUID } from 'uuid';

import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { SellerService } from '../../services/seller.service';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { UserService } from '../../../security/services/user.service';
import { UserValidatorService } from '../../../security/validators/user-validator.service';
import { IdentityDocumentService } from '../../services/identity-document.service';
import { AlertService } from '@shared/services/alert.service';
import { datePatt, emailPatt, numberDocumentPatt, numberPatt, passwordPatt } from '@shared/helpers/regex.helper';
import { RoleService } from '../../../security/services/role.service';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { UploadFileService } from '@shared/services/upload-file.service';
import { IdentityDocument, Seller } from '../../interfaces';
import { User } from '../../../security/interfaces';
import { environments } from '@envs/environments';
import { apiSeller } from '@shared/helpers/web-apis.helper';
import { initFlowbite } from 'flowbite';
import { onValidImg } from '@shared/helpers/files.helper';
import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { NgSelectModule } from '@ng-select/ng-select';
import { oneLowercaseInPassword, oneUppercaseInPassword } from '@modules/admin/validators/password-valdiator.service';


@Component({
  selector: 'app-sellers',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    InputErrorsDirective,
    SpinnerComponent,
    PipesModule,
    PaginationComponent,
    NgSelectModule,
    FlatpickrDirective,
  ],
  templateUrl: './sellers.component.html',
  styles: ``
})
export default class SellersComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnCloseSellerModal') btnCloseSellerModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowSellerModal') btnShowSellerModal!: ElementRef<HTMLButtonElement>;

  public sellerModalTitle = 'Crear nuevo vendedor';
  maxBirthDate: Date = new Date(2005, 12, 31 );
  currentDate: Date = new Date();

  private _router = inject( Router );
  private _sellerService = inject( SellerService );
  private _userValidatorService = inject( UserValidatorService );

  private _identityDocService = inject( IdentityDocumentService );

  private _alertService = inject( AlertService );
  private _uploadFileService = inject( UploadFileService );

  private _formBuilder = inject( UntypedFormBuilder );

  private _isLoading = signal( true );
  private _isSaving = signal( false );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public userForm = this._formBuilder.group({
    id:                 [ '', [] ],
    name:               [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    surname:            [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    email:              [ '', [ Validators.required, Validators.pattern( emailPatt ) ] ],
    password:           [ '', [ Validators.required, Validators.pattern( passwordPatt ), Validators.minLength( 8 ), oneUppercaseInPassword(), oneLowercaseInPassword() ] ],
    identityDocumentId: [ null, [ Validators.required ] ],
    identityNumber:     [ '', [ Validators.required ] ],
    address:            [ '', [ Validators.pattern( fullTextPatt ) ] ],
    birthDate:          [ null, [ Validators.pattern( datePatt ) ] ],
    admissionDate:      [ null, [ Validators.pattern( datePatt ) ] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._userValidatorService ],
  });

  private _isRemoving = false;

  private _totalSellers = signal<number>( 0 );
  private _sellers = signal<Seller[]>( [] );
  private _identityDocuments = signal<IdentityDocument[]>( [] );

  private _allowList = signal( true );

  public readonly identityDocuments = computed( () => this._identityDocuments() );
  public sellers = computed( () => this._sellers() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public totalSellers = computed( () => this._totalSellers() );
  public allowList = computed( () => this._allowList() );

  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  inputErrors( field: string ) {
    return this.userForm.get(field)?.errors ?? null;
  }

  get isInvalidSearchInput() { return this.searchInput.invalid; }
  get formErrors() { return this.userForm.errors; }
  get isFormInvalid() { return this.userForm.invalid; }
  get sellerBody(): any{ return  this.userForm.value as any; }

  showPassword =  false;
  get errorLengthPassword() {
    const errorsPassword = this.userForm.get('password')?.errors ?? [];
    const errors = Object.keys( errorsPassword );

    return errors.includes('minlength');
  }

  get errorUppercasePassword() {
    const errorsPassword = this.userForm.get('password')?.errors ?? [];
    const errors = Object.keys( errorsPassword );

    return errors.includes('oneUpperCase');
  }

  get errorLowercasePassword() {
    const errorsPassword = this.userForm.get('password')?.errors ?? [];
    const errors = Object.keys( errorsPassword );

    return errors.includes('oneLowercase');
  }

  get errorNumberPassword() {
    const errorsPassword = this.userForm.get('password')?.errors ?? [];
    const errors = Object.keys( errorsPassword );

    return errors.includes('oneNumber');
  }

  isTouched( field: string ) {
    return this.userForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    initFlowbite();

    this.onListenAuthRx();

    this.onGetSelectsData();
    this.onGetSellers();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetSelectsData() {

    this._identityDocService.getIdentityDocuments().subscribe( ( { identityDocuments } ) => {
      this._identityDocuments.set( identityDocuments )
    });

  }

  onGetSellers( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiSeller && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._sellerService.getSellers( page, filter )
    .subscribe({
      next: ({ sellers, total }) => {
        // this._currentPage.set( page );
        this._totalSellers.set( total );
        this._sellers.set( sellers );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
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

  onResetAfterSubmit() {
    this.sellerModalTitle = 'Crear nuevo vendedor';
    this.userForm.reset();
    this._isSaving.set( false );
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl )
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

  onLoadToUpdate( seller: Seller ) {
    this._alertService.showLoading();

    this._sellerService.getSellerById( seller.id )
    .subscribe({
      next: (role) => {

        const { createAt, isActive, userCreate, photo, roles, identityDocument, ...rest } = role;

        this.fileUrl.set( photo?.urlImg ?? environments.defaultImgUrl );
        this.userForm.reset( {
          ...rest,
          identityDocumentId: identityDocument.id,
          rolesId: roles.map( (role) => role.id )
        } );
        this.sellerModalTitle = 'Actualizar vendedor';
        this.btnShowSellerModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  async onRemoveConfirm( seller: Seller ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar vendedor "${ seller.fullname }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeSeller( seller.id );
    }
  }

  private _removeSeller( sellerId: string ) {

    const allowDelete = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiSeller && permission.methods.includes( 'DELETE' )
    );

    if( !allowDelete ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para eliminar un vendedor', 'warning');
      return;
    }

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._sellerService.removeSeller( sellerId )
    .subscribe({
      next: (sellerDeleted) => {
        this.onGetSellers();
        this._isRemoving = false;
        this._alertService.close();

        this._alertService.showAlert('Vendedor eliminado exitosamente', undefined, 'success');

      }, error: (err) => {
        this._isRemoving = false;
        this._alertService.close();
      }
    });

  }

  onRedirectUserProfile( user: User ) {

    const nameSanitize = (user.name + user.surname).replaceAll(' ', '-').toUpperCase();

    localStorage.setItem('userProfileId', user.id);
    localStorage.setItem('userProfileName', nameSanitize);

    this._router.navigate(['dashboard/profile/home/', nameSanitize]);
  }

  onSubmit() {

    this.userForm.markAllAsTouched();

    if( this.isFormInvalid || this._isLoading() ) return;

    const { id = 'xD', ...body } = this.sellerBody;

    if( !ISUUID( id ) ) {

      const allowCreate = this._webUrlPermissionMethods.some(
        (permission) => permission.webApi == apiSeller && permission.methods.includes( 'POST' )
      );

      if( !allowCreate ) {
        this._alertService.showAlert( undefined, 'No tiene permiso para crear un vendedor', 'warning');
        return;
      }

      this._isLoading.set( true );
      this._sellerService.createSeller( body )
      .subscribe({
        next: async ( sellerCreated ) => {

          if( this._file ) {
            await this._uploadFileService.uploadFile( this._file, sellerCreated.id, 'users' );
          }

          this.onResetAfterSubmit();
          this.btnCloseSellerModal.nativeElement.click();
          this.onGetSellers();

          this._alertService.showAlert('Vendedor creado exitosamente', undefined, 'success');
          // this._isLoading.set( false );

        }, error: (err) => {

          this._isLoading.set( false );
        }
      });
      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiSeller && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un vendedor', 'warning');
      return;
    }

    this._isLoading.set( true );

    this._sellerService.updateSeller( id, body )
      .subscribe({
        next: async ( sellerUpdated ) => {

          if( this._file ) {
            await this._uploadFileService.uploadFile( this._file, sellerUpdated.id, 'users' );
          }

          this.onResetAfterSubmit();
          this.btnCloseSellerModal.nativeElement.click();
          this.onGetSellers();
          this._isLoading.set( false );

          this._alertService.showAlert('Vendedor actualizado exitosamente', undefined, 'success');

        }, error: (err) => {

          this._isLoading.set( false );
        }
      });
  }

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
  }

}
