import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { validate as ISUUID } from 'uuid';

import { PaymentMethod, PaymentMethodBody } from '../../interfaces';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { PaymentMethodService } from '../../services/payment-method.service';
import { codePatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { UploadFileService } from '@shared/services/upload-file.service';
import { apiPaymentMethod } from '@shared/helpers/web-apis.helper';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { environments } from '@envs/environments';
import { AlertService } from '@shared/services/alert.service';
import { onValidImg } from '@shared/helpers/files.helper';
import { PipesModule } from '@pipes/pipes.module';
import { PaymentMethodValidatorService } from '../../validators/payment-method-validator.service';

@Component({
  selector: 'app-payment-method',
  standalone: true,
  imports: [
    CommonModule,
    InputErrorsDirective,
    SpinnerComponent,
    ReactiveFormsModule,
    FormsModule,
    PaginationComponent,
    PipesModule
  ],
  templateUrl: './payment-method.component.html',
  styles: ``
})
export default class PaymentMethodComponent implements OnInit, OnDestroy {

  //redux
  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnClosePaymentMethodModal') btnClosePaymentMethodModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowPaymentMethodModal') btnShowPaymentMethodModal!: ElementRef<HTMLButtonElement>;

  private _paymentMethodService = inject( PaymentMethodService );
  private _paymentMethodValidatorService = inject( PaymentMethodValidatorService );
  private _alertService = inject( AlertService );
  private _uploadService = inject( UploadFileService );
  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  private _filter = '';
  public paymentMethodModalTitle = 'Crear nuevo método de pago';

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isRemoving = false;

  private _allowList = signal( true );
  private _totalPaymentsMethod = signal( 0 );
  private _paymentsMethod = signal<PaymentMethod[]>( [] );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public allowList = computed( () => this._allowList() );
  public paymentsMethod = computed( () => this._paymentsMethod() );
  public totalPaymentsMethod = computed( () => this._totalPaymentsMethod() );

  private _formBuilder = inject( UntypedFormBuilder );

  public paymentMethodForm = this._formBuilder.group({
    id:          [ null, [] ],
    code:        [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( codePatt ) ] ],
    name:        [ '', [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    description: [ '', [ Validators.pattern( fullTextPatt ) ] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._paymentMethodValidatorService ],
  });

  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  inputErrors( field: string ) {
    return this.paymentMethodForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.paymentMethodForm.errors; }
  get isFormInvalid() { return this.paymentMethodForm.invalid; }
  get paymentMethodBody(): PaymentMethodBody { return  this.paymentMethodForm.value as PaymentMethodBody; }

  isTouched( field: string ) {
    return this.paymentMethodForm.get(field)?.touched ?? false;
  }

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {
    initFlowbite();
    this.onListenAuthRx();
    this.onGetPaymentsMethod();
  }

  onSearch() {
    this._filter = this.searchInput.value ?? '';
    this.onGetPaymentsMethod( 1 );
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetPaymentsMethod( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    this._isLoading.set( true );
    this._paymentMethodService.getPaymentsMethod( page, this._filter )
    .subscribe({
      next: ({ paymentsMethod, total }) => {

        this._totalPaymentsMethod.set( total );
        this._paymentsMethod.set( paymentsMethod );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onResetAfterSubmit() {
    this.paymentMethodModalTitle = 'Crear método de pago';
    this.paymentMethodForm.reset();
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

  onLoadToUpdate( paymentmethod: PaymentMethod ) {

    this._alertService.showLoading();

    this._paymentMethodService.getPaymentMethodById( paymentmethod.id )
    .subscribe({
      next: (paymentMethodById) => {

        const { createAt, isActive, userCreate, photo, ...rest } = paymentMethodById;

        this.paymentMethodForm.reset( rest );
        this.fileUrl.set( photo?.urlImg ?? environments.defaultImgUrl );
        this.paymentMethodModalTitle = 'Actualizar método de pago';
        this.btnShowPaymentMethodModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) return;

    const { id, ...body } = this.paymentMethodBody;

    const allowCreate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'POST' )
    );

    if( !allowCreate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para crear un Método de pago', 'warning');
      return;
    }

    this._alertService.showLoading();

    this._isSaving.set( true );

    if( !ISUUID( id ) ) {

      this._paymentMethodService.createPaymentMethod( body )
      .subscribe({
        next: async ( paymentMethodCreated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, paymentMethodCreated.id, 'payments-method' );
          }

          this.onResetAfterSubmit();
          this.btnClosePaymentMethodModal.nativeElement.click();
          this._alertService.showAlert('Método de pago creado exitosamente', undefined, 'success');
          this.onGetPaymentsMethod();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un Método de pago', 'warning');
      return;
    }

    this._paymentMethodService.updatePaymentMethod( id ?? 'xD', body )
      .subscribe({
        next: async ( paymentMethodUpdated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, paymentMethodUpdated.id, 'payments-method' );
          }

          this.onResetAfterSubmit();
          this.btnClosePaymentMethodModal.nativeElement.click();
          this.onGetPaymentsMethod();

          this._alertService.showAlert('Método de pago actualizado exitosamente', undefined, 'success');

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

  }

  async onRemoveConfirm( paymentMethod: PaymentMethod ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar método de pago: "${ paymentMethod.name }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removePaymentMethod( paymentMethod.id );
    }
  }

  private _removePaymentMethod( paymentMethodId: string ) {

    const allowDelete = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'DELETE' )
    );

    if( !allowDelete ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para eliminar un Método de pago', 'warning');
      return;
    }

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._paymentMethodService.removePaymentMethod( paymentMethodId )
    .subscribe({
      next: (userDeleted) => {
        this.onGetPaymentsMethod();
        this._isRemoving = false;
        this._alertService.showAlert('Método de pago eliminado exitosamente', undefined, 'success');

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
