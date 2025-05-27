import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { NgSelectModule } from '@ng-select/ng-select';
import { validate as ISUUID } from 'uuid';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { AppState } from '@app/app.config';
import { Contract, ContractPayment, ContractPaymentBody, PaymentMethod } from '../../interfaces';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { ContractService } from '../../services/contract.service';
import { PaymentMethodService } from '../../services/payment-method.service';
import { descriptionPatt, fullTextPatt, operationCodePatt } from '@shared/helpers/regex.helper';
import { ContractPaymentService } from '../../services/contract-payment.service';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { apiContractPayment } from '@shared/helpers/web-apis.helper';
import { UploadFileService } from '@shared/services/upload-file.service';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { AlertService } from '@shared/services/alert.service';
import { environments } from '@envs/environments';
import { PipesModule } from '@pipes/pipes.module';
import { onValidImg } from '@shared/helpers/files.helper';

@Component({
  selector: 'app-contract-payment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PaginationComponent,
    InputErrorsDirective,
    SpinnerComponent,
    NgSelectModule,
    PipesModule
  ],
  templateUrl: './contract-payment.component.html',
  styles: ``
})
export default class ContractPaymentComponent implements OnInit, OnDestroy {

  //redux
  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnShowContractPaymentModal') btnShowContractPaymentModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnCloseContractPaymentModal') btnCloseContractPaymentModal!: ElementRef<HTMLButtonElement>;

  private _contractService = inject( ContractService );
  private _paymentMethodService = inject( PaymentMethodService );
  private _contractPaymentService = inject( ContractPaymentService );
  private _alertService = inject( AlertService );
  private _uploadService = inject( UploadFileService );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public searchContractInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _formBuilder = inject( UntypedFormBuilder );

  public contractPaymentForm = this._formBuilder.group({
    id:              [ '', [] ],
    contractId:      [ null, [ Validators.required ] ],
    paymentMethodId:      [ null, [ Validators.required ] ],
    operationCode:   [ '', [ Validators.required, Validators.minLength(6), Validators.pattern( operationCodePatt ) ] ],
    amount:          [ '', [ Validators.required, Validators.min(100), Validators.max( 100000 ) ] ],
    observation:     [ '', [ Validators.pattern( descriptionPatt ) ] ],
  });

  public fileUrl = signal( environments.defaultImgUrl );
  private _file?: File;

  private _contractPayments = signal<ContractPayment[]>( [] );
  private _totalContractPayments = signal<number>( 0 );
  private _contracts = signal<Contract[]>( [] );
  private _paymentsMethod = signal<PaymentMethod[]>( [] );
  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isRemoving = false;
  private _allowList = signal( true );

  public contractPayments = computed( () => this._contractPayments() );
  public totalContractPayments = computed( () => this._totalContractPayments() );
  public contracts = computed( () => this._contracts() );
  public paymentsMethod = computed( () => this._paymentsMethod() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public allowList = computed( () => this._allowList() );
  public contractPaymentModalTitle = 'Crear nuevo pago';

  inputErrors( field: string ) {
    return this.contractPaymentForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.contractPaymentForm.errors; }
  get isFormInvalid() { return this.contractPaymentForm.invalid; }
  get contractPaymentBody(): ContractPaymentBody { return  this.contractPaymentForm.value as ContractPaymentBody; }

  isTouched( field: string ) {
    return this.contractPaymentForm.get(field)?.touched ?? false;
  }

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {

    this.onListenAuthRx();
    initFlowbite();
    this.onGetContractPayment();
    this.onGetContract();
    this.onGetPaymentsMethod();

  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetContractPayment( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiContractPayment && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._contractPaymentService.getContractPayments( page, filter, '' )
    .subscribe({
      next: ({ contractPayments, total }) => {

        this._totalContractPayments.set( total );
        this._contractPayments.set( contractPayments );

        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onGetPaymentsMethod( page = 1 ) {

    this._paymentMethodService.getPaymentsMethod( page, '' )
    .subscribe(({ paymentsMethod, total }) => {

      this._paymentsMethod.set( paymentsMethod );

    });

  }

  onGetContract() {
    const filter = this.searchContractInput.value ?? '';

    this._contractService.getContracts( 1, filter )
    .subscribe( ({ contracts, total }) => {

      this._contracts.set( contracts );

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
    this.contractPaymentModalTitle = 'Crear nuevo pago';
    this.contractPaymentForm.reset();
    this.searchContractInput.reset();
    this._isSaving.set( false );
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
  }

  onLoadToUpdate( contractPayment: ContractPayment ) {

    this._alertService.showLoading();

    this._contractPaymentService.getContractPaymentById( contractPayment.id )
    .subscribe({
      next: (contractPayment) => {

        const { createAt, isActive, userCreate, photo, contract, paymentMethod, ...rest } = contractPayment;

        this.searchContractInput.setValue( contract.code );
        this.onGetContract();

        this.contractPaymentForm.reset({
          contractId: contract.id,
          paymentMethodId: paymentMethod.id,
          ...rest
        });
        this.fileUrl.set( photo?.urlImg ?? environments.defaultImgUrl );
        this.contractPaymentModalTitle = 'Actualizar pago';
        this.btnShowContractPaymentModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) return;

    const { id, ...body } = this.contractPaymentBody;

    const allowCreate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiContractPayment && permission.methods.includes( 'POST' )
    );

    if( !allowCreate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para crear un Pago', 'warning');
      return;
    }

    this._alertService.showLoading();

    this._isSaving.set( true );

    if( !ISUUID( id ) ) {

      this._contractPaymentService.createContractPayment( body )
      .subscribe({
        next: async ( contractPaymentCreated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, contractPaymentCreated.id, 'contract-payments' );
          }

          this.onResetAfterSubmit();
          this.btnCloseContractPaymentModal.nativeElement.click();
          this._alertService.showAlert('Pago creado exitosamente', undefined, 'success');
          this.onGetContractPayment();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiContractPayment && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un Pago', 'warning');
      return;
    }

    this._contractPaymentService.updateContractPayment( id ?? 'xD', body )
      .subscribe({
        next: async ( contractPaymentUpdated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, contractPaymentUpdated.id, 'contract-payments' );
          }

          this.onResetAfterSubmit();
          this.btnCloseContractPaymentModal.nativeElement.click();
          this.onGetContractPayment();

          this._alertService.showAlert('Pago actualizado exitosamente', undefined, 'success');

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

  }

  async onRemoveConfirm( contractPayment: ContractPayment ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar pago: "${ contractPayment.operationCode }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeUser( contractPayment.id );
    }
  }

  private _removeUser( contractPaymentId: string ) {

    const allowDelete = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiContractPayment && permission.methods.includes( 'DELETE' )
    );

    if( !allowDelete ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para eliminar un Pago', 'warning');
      return;
    }

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._contractPaymentService.removeContractPayment( contractPaymentId )
    .subscribe({
      next: (contractPaymentDeleted) => {
        this.onGetContractPayment();
        this._isRemoving = false;
        this._alertService.showAlert('Pago eliminado exitosamente', undefined, 'success');

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
