import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { NgSelectModule } from '@ng-select/ng-select';
import { validate as ISUUID } from 'uuid';

import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { emailPatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { AlertService } from '@shared/services/alert.service';
import { UserService } from '../../services/user.service';
import { Role, User, UserBody } from '../../interfaces';
import { environments } from '@envs/environments';
import { onValidImg } from '@shared/helpers/files.helper';
import { RoleService } from '../../services/role.service';
import { UploadFileService } from '@shared/services/upload-file.service';

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
    NgSelectModule
  ],
  templateUrl: './users.component.html',
  styles: ``
})
export default class UsersComponent implements OnInit {

  @ViewChild('btnCloseUserModal') btnCloseUserModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowUserModal') btnShowUserModal!: ElementRef<HTMLButtonElement>;

  public userModalTitle = 'Crear nuevo usuario';

  private _userService = inject( UserService );
  private _alertService = inject( AlertService );
  private _roleService = inject( RoleService );
  private _uploadFileService = inject( UploadFileService );

  private _formBuilder = inject( UntypedFormBuilder );

  private _isLoading = signal( true );
  private _isSaving = signal( false );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public userForm = this._formBuilder.group({
    id:          [ '', [] ],
    name:        [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    surname:     [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    email:       [ '', [ Validators.required, Validators.pattern( emailPatt ) ] ],
    rolesId:     [ [], [ Validators.required, Validators.minLength(1) ] ],
  }, {
    // updateOn: 'blur',
    // asyncValidators: [ this._roleValidatorService.alreadyRoleValidator() ],
  });

  private _filter = '';
  private _isRemoving = false;

  private _totalUsers = signal<number>( 0 );
  private _users = signal<User[]>( [] );
  private _roles = signal<Role[]>( [] );

  public readonly roles = computed( () => this._roles() );
  public users = computed( () => this._users() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public totalUsers = computed( () => this._totalUsers() );


  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  inputErrors( field: string ) {
    return this.userForm.get(field)?.errors ?? null;
  }

  get isInvalidSearchInput() { return this.searchInput.invalid; }
  get formErrors() { return this.userForm.errors; }
  get isFormInvalid() { return this.userForm.invalid; }
  get userBody(): UserBody{ return  this.userForm.value as UserBody; }

  isTouched( field: string ) {
    return this.userForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    initFlowbite();

    this.onGetRoles();
    this.onGetUsers();
  }

  onSearch() {
    this._filter = this.searchInput.value ?? '';
    this.onGetUsers( 1 );
  }

  onGetRoles() {
    this._roleService.getRoles( 1, '', 100 )
    .subscribe( ({ roles }) => {
      this._roles.set( roles );
    });
  }

  onGetUsers( page = 1 ) {
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
  }

  onLoadToUpdate( user: User ) {
    this._alertService.showLoading();

    this._userService.getUserById( user.id )
    .subscribe({
      next: (role) => {

        const { createAt, isActive, userCreate, photo, roles, ...rest } = role;

        this.fileUrl.set( photo?.urlImg ?? environments.defaultImgUrl );
        this.userForm.reset( {
          ...rest,
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

    this._isLoading.set( true );

    const { id = 'xD', ...body } = this.userBody;

    if( !ISUUID( id ) ) {
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

}
