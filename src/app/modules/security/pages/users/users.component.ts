import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { NgSelectModule } from '@ng-select/ng-select';
import { validate as ISUUID } from 'uuid';
import { Subscription, forkJoin } from 'rxjs';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { Router, RouterModule } from '@angular/router';

import { Store } from '@ngrx/store';
import { AppState } from '@app/app.config';
import { apiUser } from '@shared/helpers/web-apis.helper';

import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { datePatt, emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, passwordPatt } from '@shared/helpers/regex.helper';
import { AlertService } from '@shared/services/alert.service';
import { Role, User, UserBody } from '../../interfaces';
import { environments } from '@envs/environments';
import { onValidImg } from '@shared/helpers/files.helper';
import { UploadFileService } from '@shared/services/upload-file.service';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { IdentityDocumentService } from '../../../admin/services/identity-document.service';
import { IdentityDocument } from '../../../admin/interfaces';
import { UserValidatorService } from '../../validators/user-validator.service';
import { oneLowercaseInPassword, oneUppercaseInPassword } from '@modules/admin/validators/password-valdiator.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    SpinnerComponent,
    PipesModule,
    InputErrorsDirective,
    NgSelectModule,
    FlatpickrDirective,
    RouterModule
  ],
  templateUrl: './users.component.html',
  styles: ``
})
export default class UsersComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnCloseUserModal') btnCloseUserModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowUserModal') btnShowUserModal!: ElementRef<HTMLButtonElement>;

  public userModalTitle = 'Crear nuevo usuario';
  maxBirthDate: Date = new Date(2005, 12, 31 );
  currentDate: Date = new Date();

  private _router = inject( Router );
  private _userService = inject( UserService );
  private _userValidatorService = inject( UserValidatorService );

  private _identityDocService = inject( IdentityDocumentService );

  private _alertService = inject( AlertService );
  private _roleService = inject( RoleService );
  private _uploadFileService = inject( UploadFileService );

  private _formBuilder = inject( UntypedFormBuilder );

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  showPassword =  false;

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public userForm = this._formBuilder.group({
    id:                 [ '', [] ],
    name:               [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    surname:            [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    email:              [ '', [ Validators.required, Validators.pattern( emailPatt ) ] ],
    password:           [ '', [ Validators.required, Validators.pattern( passwordPatt ), Validators.minLength( 8 ), oneUppercaseInPassword(), oneLowercaseInPassword() ] ],
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

  private _filter = '';
  private _isRemoving = false;

  private _totalUsers = signal<number>( 0 );
  private _users = signal<User[]>( [] );
  private _roles = signal<Role[]>( [] );
  private _identityDocuments = signal<IdentityDocument[]>( [] );

  private _allowList = signal( true );

  public readonly roles = computed( () => this._roles() );
  public readonly identityDocuments = computed( () => this._identityDocuments() );
  public users = computed( () => this._users() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public totalUsers = computed( () => this._totalUsers() );
  public allowList = computed( () => this._allowList() );

  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  inputErrors( field: string ) {
    return this.userForm.get(field)?.errors ?? null;
  }

  get isInvalidSearchInput() { return this.searchInput.invalid; }
  get formErrors() { return this.userForm.errors; }
  get isFormInvalid() { return this.userForm.invalid; }
  get userBody(): UserBody{ return  this.userForm.value as UserBody; }

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
    this.onGetUsers();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onSearch() {
    this._filter = this.searchInput.value ?? '';
    this.onGetUsers( 1 );
  }

  onGetSelectsData() {

    forkJoin({
      rolesResponse: this._roleService.getRoles( 1, '', 100 ),
      documentsIdentityResponse: this._identityDocService.getIdentityDocuments()
    }).subscribe( ( {rolesResponse, documentsIdentityResponse} ) => {
      this._roles.set( rolesResponse.roles );
      this._identityDocuments.set( documentsIdentityResponse.identityDocuments )
    });

  }

  onGetUsers( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiUser && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    this._isLoading.set( true );
    this._userService.getUsers( page, this._filter )
    .subscribe({
      next: ({ users, total }) => {
        // this._currentPage.set( page );
        this._totalUsers.set( total );
        this._users.set( users );
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
    this.userModalTitle = 'Crear nuevo usuario';
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

  onLoadToUpdate( user: User ) {
    this._alertService.showLoading();

    this._userService.getUserById( user.id )
    .subscribe({
      next: (role) => {

        const { createAt, isActive, userCreate, photo, roles, identityDocument, ...rest } = role;

        this.fileUrl.set( photo?.urlImg ?? environments.defaultImgUrl );
        this.userForm.reset( {
          ...rest,
          identityDocumentId: identityDocument.id,
          rolesId: roles.map( (role) => role.id )
        } );
        this.userModalTitle = 'Actualizar usuario';
        this.btnShowUserModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  async onRemoveConfirm( user: User ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar usuario "${ user.fullname }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeUser( user.id );
    }
  }

  private _removeUser( userId: string ) {

    const allowDelete = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiUser && permission.methods.includes( 'DELETE' )
    );

    if( !allowDelete ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para eliminar un usuario', 'warning');
      return;
    }

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._userService.removeUser( userId )
    .subscribe({
      next: (userDeleted) => {
        this.onGetUsers();
        this._isRemoving = false;
        this._alertService.close();

        this._alertService.showAlert('Usuario eliminado exitosamente', undefined, 'success');

      }, error: (err) => {
        this._isRemoving = false;
        this._alertService.close();
      }
    });

  }

  onSubmit() {

    this.userForm.markAllAsTouched();

    if( this.isFormInvalid || this._isLoading() ) return;


    const { id = 'xD', ...body } = this.userBody;

    if( !ISUUID( id ) ) {

      const allowCreate = this._webUrlPermissionMethods.some(
        (permission) => permission.webApi == apiUser && permission.methods.includes( 'POST' )
      );

      if( !allowCreate ) {
        this._alertService.showAlert( undefined, 'No tiene permiso para crear un usuario', 'warning');
        return;
      }

      this._isLoading.set( true );
      this._userService.createUser( body )
      .subscribe({
        next: async ( userCreated ) => {

          if( this._file ) {
            await this._uploadFileService.uploadFile( this._file, userCreated.id, 'users' );
          }

          this.onResetAfterSubmit();
          this.btnCloseUserModal.nativeElement.click();
          this.onGetUsers();

          this._alertService.showAlert('Usuario creado exitosamente', undefined, 'success');
          // this._isLoading.set( false );

        }, error: (err) => {

          this._isLoading.set( false );
        }
      });
      return;
    }


    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiUser && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un usuario', 'warning');
      return;
    }

    this._isLoading.set( true );

    this._userService.updateUser( id, body )
      .subscribe({
        next: async ( userUpdated ) => {

          if( this._file ) {
            await this._uploadFileService.uploadFile( this._file, userUpdated.id, 'users' );
          }

          this.onResetAfterSubmit();
          this.btnCloseUserModal.nativeElement.click();
          this.onGetUsers();
          this._isLoading.set( false );

          this._alertService.showAlert('Usuario actualizado exitosamente', undefined, 'success');

        }, error: (err) => {

          this._isLoading.set( false );
        }
      });
  }

  onRedirectUserProfile( user: User ) {

    const nameSanitize = (user.name + user.surname).replaceAll(' ', '-').toUpperCase();

    localStorage.setItem('userProfileId', user.id);
    localStorage.setItem('userProfileName', nameSanitize);

    this._router.navigate(['dashboard/profile/home/', nameSanitize]);
  }

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
  }

}
