import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { validate as ISUUID } from 'uuid';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { initFlowbite } from 'flowbite';

import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { apiAreaCompany } from '@shared/helpers/web-apis.helper';
import { AlertService } from '@shared/services/alert.service';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { PipesModule } from '@pipes/pipes.module';
import { AreaCompanyValdidatorService } from '../../validators/area-company-validator.service';
import { AreaCompanyService } from '../../services/area-company.service';
import { AreaCompany } from '../../interfaces';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';

@Component({
  selector: 'app-area-company',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    PaginationComponent,
    PipesModule,
    InputErrorsDirective
  ],
  templateUrl: './area-company.component.html',
  styles: ``
})
export default class AreaCompanyComponent implements OnInit, OnDestroy {

  //redux
  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnCloseAreaCompanyModal') btnCloseAreaCompanyModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowAreaCompanyModal') btnShowAreaCompanyModal!: ElementRef<HTMLButtonElement>;

  private _alertService = inject( AlertService );
  private _areaCompanyService = inject( AreaCompanyService );
  private _areaCompanyValidatorService = inject( AreaCompanyValdidatorService );

  public areaCompanyModalTitle = 'Crear nuevo método de pago';

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isRemoving = false;
  private _totalAreasCompany = signal( 0 );
  private _areasCompany = signal<AreaCompany[]>( [] );
  private _allowList = signal( true );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public areasCompany = computed( () => this._areasCompany() );
  public totalAreasCompany = computed( () => this._totalAreasCompany() );
  public allowList = computed( () => this._allowList() );

  private _formBuilder = inject( UntypedFormBuilder );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  private _filter = '';

  public areaCompanyForm = this._formBuilder.group({
    id:          [ null, [] ],
    name:        [ '',   [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    description: [ '',   [ Validators.pattern( fullTextPatt ) ] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._areaCompanyValidatorService ],
  });

  inputErrors( field: string ) {
    return this.areaCompanyForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.areaCompanyForm.errors; }
  get isFormInvalid() { return this.areaCompanyForm.invalid; }
  get areaCompanyBody(): any { return  this.areaCompanyForm.value as any; }

  isTouched( field: string ) {
    return this.areaCompanyForm.get(field)?.touched ?? false;
  }

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {

    initFlowbite();
    this.onListenAuthRx();
    this.onGetAreaCompany();

  }

  onGetAreaCompany( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiAreaCompany && permission.methods.includes( 'GET' )

    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    this._filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._areaCompanyService.getAreasCompany( page, this._filter )
    .subscribe({
      next: ({ areasComapny, total }) => {

        this._totalAreasCompany.set( total );
        this._areasCompany.set( areasComapny );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onLoadToUpdate( areaCompany: AreaCompany ) {

    this._alertService.showLoading();

    this._areaCompanyService.getAreaCompanyById( areaCompany.id )
    .subscribe({
      next: (areaCompanyById) => {

        const { createAt, isActive, userCreate, ...rest } = areaCompanyById;

        this.areaCompanyForm.reset( rest );
        this.areaCompanyModalTitle = 'Actualizar método de pago';
        this.btnShowAreaCompanyModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  async onRemoveConfirm( areaCompany: AreaCompany ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar área: "${ areaCompany.name }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeAreaCompany( areaCompany.id );
    }
  }

  private _removeAreaCompany( areaCompanyId: string ) {

    const allowDelete = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiAreaCompany && permission.methods.includes( 'DELETE' )
    );

    if( !allowDelete ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para eliminar un Área de empresa', 'warning');
      return;
    }

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._areaCompanyService.removeAreaCompany( areaCompanyId )
    .subscribe({
      next: (userDeleted) => {
        this.onGetAreaCompany();
        this._isRemoving = false;
        this._alertService.showAlert('Área de empresa eliminada exitosamente', undefined, 'success');

      }, error: (err) => {
        this._isRemoving = false;
        this._alertService.close();
      }
    });

  }

  onResetAfterSubmit() {
    this.areaCompanyModalTitle = 'Crear área de empresa';
    this.areaCompanyForm.reset();
    this._isSaving.set( false );
  }

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) return;

    const { id, ...body } = this.areaCompanyBody;

    const allowCreate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiAreaCompany && permission.methods.includes( 'POST' )
    );

    if( !allowCreate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para crear una Área de empresa', 'warning');
      return;
    }

    this._alertService.showLoading();

    this._isSaving.set( true );

    if( !ISUUID( id ) ) {

      this._areaCompanyService.createAreaCompany( body )
      .subscribe({
        next: async ( areaCompanyCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseAreaCompanyModal.nativeElement.click();
          this._alertService.showAlert('Área de empresa creada exitosamente', undefined, 'success');
          this.onGetAreaCompany();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiAreaCompany && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar una Área de empresa', 'warning');
      return;
    }

    this._areaCompanyService.updateAreaCompany( id ?? 'xD', body )
      .subscribe({
        next: async ( areaCompanyUpdated ) => {

          this.btnCloseAreaCompanyModal.nativeElement.click();
          this.onGetAreaCompany();

          this._alertService.showAlert('Área de empresa actualizada exitosamente', undefined, 'success');

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

  }

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
  }

}
