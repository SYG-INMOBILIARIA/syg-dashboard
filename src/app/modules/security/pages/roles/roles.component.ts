import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { RoleService } from '../../services/role.service';
import { Role, RoleBody } from '../../interfaces';
import { RoleValidatorService } from '../../validators';

import { codePatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { AlertService } from '@shared/services/alert.service';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { PipesModule } from '@pipes/pipes.module';
import { AppState } from '../../../../app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiRole } from '@shared/helpers/web-apis.helper';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    SpinnerComponent,
    PipesModule,
    InputErrorsDirective
  ],
  templateUrl: './roles.component.html',
  styles: ``
})
export default class RolesComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;

  @ViewChild('btnCloseRoleModal') btnCloseRoleModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowRoleModal') btnShowRoleModal!: ElementRef<HTMLButtonElement>;

  public roleModalTitle = 'Crear nuevo rol';

  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  private _roleService = inject( RoleService );
  private _alertService = inject( AlertService );
  private _formBuilder = inject( UntypedFormBuilder );
  private _roleValidatorService = inject( RoleValidatorService );
  private _roleToUpdate = signal<Role | null>( null );
  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _allowList = signal( true );
  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _totalRoles = signal<number>( 0 );

  public roleForm = this._formBuilder.group({
    id:          [ '', [] ],
    name:        [ '', [ Validators.required, Validators.minLength(5) ] ],
    code:        [ '', [ Validators.required, Validators.minLength(5), Validators.pattern( codePatt ) ] ],
    description: [ '', [ Validators.pattern( fullTextPatt ) ] ],
  }, {
    updateOn: 'blur',
    asyncValidators: [ this._roleValidatorService.alreadyRoleValidator() ],
  });

  private _filter = '';
  private _isRemoving = false;
  private _roles = signal<Role[]>( [] );

  public roles = computed( () => this._roles() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public totalRoles = computed( () => this._totalRoles() );
  public allowList = computed( () => this._allowList() );

  get isFormInvalid() { return this.roleForm.invalid; }
  get roleBody(): RoleBody{ return  this.roleForm.value as RoleBody; }
  get isInvalidSearchInput() { return this.searchInput.invalid; }

  inputErrors( field: string ) {
    return this.roleForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.roleForm.errors; }

  isTouched( field: string ) {
    return this.roleForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    initFlowbite();
    this.onListenAuthRx();
    this.onGetRoles();
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
    this.onGetRoles( 1 );
  }

  onGetRoles( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiRole && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    this._isLoading.set( true );
    this._roleService.getRoles( page, this._filter )
    .subscribe({
      next: ({ roles, total }) => {
        // this._currentPage.set( page );
        this._totalRoles.set( total );
        this._roles.set( roles );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onResetAfterSubmit(): void {
    this.roleModalTitle = 'Crear nuevo rol';
    this.roleForm.reset();
    this._isSaving.set( false );
    this._roleToUpdate.set( null );
  }

  onLoadToUpdate( role: Role ) {

    this._alertService.showLoading();

    this._roleService.getRoleById( role.id )
    .subscribe({
      next: (role) => {

        const { createAt, isActive, userCreate, ...rest } = role;

        this._roleToUpdate.set( role );

        this.roleForm.reset( rest );
        this.roleModalTitle = 'Actualizar rol';
        this.btnShowRoleModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  onSubmit(): void {

    if( this.isFormInvalid || this.isSaving() ) return;


    const { id: _, ...bodyRole } = this.roleBody;

    const allowCreate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiRole && permission.methods.includes( 'POST' )
    );

    if( !allowCreate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para crear un Rol', 'warning');
      return;
    }

    if( !this._roleToUpdate() ) {

      this._isSaving.set( true );

      this._roleService.createRole( bodyRole )
      .subscribe({
        next: ( roleCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseRoleModal.nativeElement.click();
          this._alertService.showAlert('Rol creado exitosamente', undefined, 'success');
          this.onGetRoles();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiRole && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actulizar un Rol', 'warning');
      return;
    }

    this._isSaving.set( true );

    this._roleService.updateRole( this._roleToUpdate()!.id, bodyRole )
      .subscribe({
        next: ( roleUpdated ) => {

          this.onResetAfterSubmit();
          this.btnCloseRoleModal.nativeElement.click();
          this.onGetRoles();

          this._alertService.showAlert('Rol actualizado exitosamente', undefined, 'success');

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

  }

  async onRemoveConfirm( role: Role ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      'Verifique que no hayan usuarios con este rol',
      `¿Está seguro de eliminar rol "${ role.name }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeRole( role.id );
    }
  }

  private _removeRole( roleId: string ) {

    const allowDelete = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiRole && permission.methods.includes( 'DELETE' )
    );

    if( !allowDelete ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para eliminar un Rol', 'warning');
      return;
    }

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._roleService.removeRole( roleId )
    .subscribe({
      next: (roleDeleted) => {
        this.onGetRoles();
        this._isRemoving = false;
        this._alertService.close();
        this._alertService.showAlert('Rol actualizado exitosamente', undefined, 'success');

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
