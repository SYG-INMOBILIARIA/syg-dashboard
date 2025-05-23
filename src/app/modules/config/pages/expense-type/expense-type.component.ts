import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { PipesModule } from '@pipes/pipes.module';
import { validate as ISUUID } from 'uuid';
import { initFlowbite } from 'flowbite';

import { AlertService } from '@shared/services/alert.service';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { ExpenseTypeService } from '../../services/expense-type.service';
import { ExpenseTypeValidatorService } from '../../validators/expense-type-valdidator.service';
import { ExpenseType } from '../../interfaces';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    PaginationComponent,
    SpinnerComponent,
    InputErrorsDirective
  ],
  templateUrl: './expense-type.component.html',
  styles: ``
})
export default class ExpenseTypeComponent implements OnInit, OnDestroy {

  @ViewChild('btnCloseExpenseTypeModal') btnCloseExpenseTypeModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowExpenseTypeModal') btnShowExpenseTypeModal!: ElementRef<HTMLButtonElement>;

  private _alertService = inject( AlertService );
  private _expenseTypeService = inject( ExpenseTypeService );
  private _expenseTypeValidatorService = inject( ExpenseTypeValidatorService );

  public expenseTypeModalTitle = 'Crear nuevo Tipo de egreso';

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isRemoving = false;
  private _totalExpenseTypes = signal( 0 );
  private _expenseTypes = signal<ExpenseType[]>( [] );
  private _allowList = signal( true );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public expenseTypes = computed( () => this._expenseTypes() );
  public totalExpenseTypes = computed( () => this._totalExpenseTypes() );
  public allowList = computed( () => this._allowList() );

  private _formBuilder = inject( UntypedFormBuilder );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public expenseTypeForm = this._formBuilder.group({
    id:          [ null, [] ],
    name:        [ '',   [ Validators.required, Validators.minLength(3), Validators.pattern( fullTextPatt ) ] ],
    description: [ '',   [ Validators.pattern( fullTextPatt ) ] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._expenseTypeValidatorService ],
  });

  inputErrors( field: string ) {
    return this.expenseTypeForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.expenseTypeForm.errors; }
  get isFormInvalid() { return this.expenseTypeForm.invalid; }
  get expenseTypeBody(): any { return  this.expenseTypeForm.value as any; }

  isTouched( field: string ) {
    return this.expenseTypeForm.get(field)?.touched ?? false;
  }

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {

    initFlowbite();

    this.onGetExpenseTypes();

  }

  onGetExpenseTypes( page = 1 ) {

    // const allowList = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiAreaCompany && permission.methods.includes( 'GET' )
    // );

    // if( !allowList ) {
    //   this._allowList.set( false );
    //   return;
    // }

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._expenseTypeService.getExpenseTypes( page, filter )
    .subscribe({
      next: ({ expenseTypes, total }) => {

        this._totalExpenseTypes.set( total );
        this._expenseTypes.set( expenseTypes );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onLoadToUpdate( expenseType: ExpenseType ) {

    this._alertService.showLoading();

    this._expenseTypeService.getExpenseTypeById( expenseType.id )
    .subscribe({
      next: (expenseTypeById) => {

        const { createAt, isActive, userCreate, ...rest } = expenseTypeById;

        this.expenseTypeForm.reset( rest );
        this.expenseTypeModalTitle = 'Actualizar tipo de egreso';
        this.btnShowExpenseTypeModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  async onRemoveConfirm( expenseType: ExpenseType ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar tipo de egreso: "${ expenseType.name }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeExpenseType( expenseType.id );
    }
  }

  private _removeExpenseType( expenseTypeId: string ) {

    // const allowDelete = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'DELETE' )
    // );

    // if( !allowDelete ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para eliminar un Método de pago', 'warning');
    //   return;
    // }

    if( this._isRemoving ) return;

    this._isRemoving = true;

    this._alertService.showLoading();

    this._expenseTypeService.removeExpenseType( expenseTypeId )
    .subscribe({
      next: (userDeleted) => {
        this.onGetExpenseTypes();
        this._isRemoving = false;
        this._alertService.showAlert('Tipo de egreso eliminado exitosamente', undefined, 'success');

      }, error: (err) => {
        this._isRemoving = false;
        this._alertService.close();
      }
    });

  }

  onResetAfterSubmit() {
    this.expenseTypeModalTitle = 'Crear tipo de egreso';
    this.expenseTypeForm.reset();
    this._isSaving.set( false );
  }

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) return;

    const { id, ...body } = this.expenseTypeBody;

    // const allowCreate = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiAreaCompany && permission.methods.includes( 'POST' )
    // );

    // if( !allowCreate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para crear una Tipo de egreso', 'warning');
    //   return;
    // }

    this._alertService.showLoading();

    this._isSaving.set( true );

    if( !ISUUID( id ) ) {

      this._expenseTypeService.createExpenseType( body )
      .subscribe({
        next: async ( expenseTypeCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseExpenseTypeModal.nativeElement.click();
          this._alertService.showAlert('Tipo de egreso creado exitosamente', undefined, 'success');
          this.onGetExpenseTypes();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

      return;
    }

    // const allowUpdate = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiAreaCompany && permission.methods.includes( 'PATCH' )
    // );

    // if( !allowUpdate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para actualizar una Tipo de egreso','warning');
    //   return;
    // }

    this._expenseTypeService.updateExpenseType( id ?? 'xD', body )
      .subscribe({
        next: async ( expenseTypeUpdated ) => {

          this.btnCloseExpenseTypeModal.nativeElement.click();
          this.onGetExpenseTypes();

          this._alertService.showAlert('Tipo de egreso actualizado exitosamente', undefined, 'success');

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

  }

  ngOnDestroy(): void {


  }

}
