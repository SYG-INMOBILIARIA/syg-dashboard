import { CommonModule, formatNumber } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { validate as ISUUID } from 'uuid';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { NgSelectModule } from '@ng-select/ng-select';

import { descriptionPatt, fullTextPatt, numberPatt } from '@shared/helpers/regex.helper';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { AlertService } from '@shared/services/alert.service';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseBody } from '../../interfaces';
import { PipesModule } from '@pipes/pipes.module';
import { initFlowbite } from 'flowbite';
import { Store } from '@ngrx/store';

import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { Nomenclature } from '@shared/interfaces';
import { environments } from '@envs/environments';
import { onValidImg } from '@shared/helpers/files.helper';
import { AreaCompanyService } from '../../../config/services/area-company.service';
import { AreaCompany } from '../../../config/interfaces';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { UploadFileService } from '@shared/services/upload-file.service';
import { AppState } from '../../../../app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiExpense } from '@shared/helpers/web-apis.helper';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    PipesModule,
    InputErrorsDirective,
    SpinnerComponent,
    FlatpickrDirective,
    NgSelectModule
  ],
  templateUrl: './expenses.component.html',
  styles: ``
})
export default class ExpensesComponent implements OnInit, OnDestroy {

  //redux
  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnCloseExpenseModal') btnCloseExpenseModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowExpenseModal') btnShowExpenseModal!: ElementRef<HTMLButtonElement>;

  private _alertService = inject( AlertService );
  private _uploadService = inject( UploadFileService );
  private _expenseService = inject( ExpenseService );
  private _nomenclatureService = inject( NomenclatureService );
  private _areaCompanyService = inject( AreaCompanyService );

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isRemoving = false;
  private _isHavePhotoUpdated = false;

  private _allowList = signal( true );
  private _totalExpenses = signal( 0 );
  private _expenses = signal<Expense[]>( [] );
  private _moneyTypes = signal<Nomenclature[]>( [] );
  private _expenseTypes = signal<Nomenclature[]>( [] );
  private _areasCompany = signal<AreaCompany[]>( [] );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public allowList = computed( () => this._allowList() );
  public expenses = computed( () => this._expenses() );
  public expenseTypes = computed( () => this._expenseTypes() );
  public moneyTypes = computed( () => this._moneyTypes() );
  public areasCompany = computed( () => this._areasCompany() );
  public totalExpenses = computed( () => this._totalExpenses() );

  private _formBuilder = inject( UntypedFormBuilder );

  public expenseModalTitle = 'Crear nuevo egreso';

  currentDate: Date = new Date();
  public fileUrl = signal( environments.defaultImgUrl );
  public defaultImg = environments.defaultImgUrl;
  private _file?: File;

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public expenseForm = this._formBuilder.group({
    id:            [ null, [] ],
    expenseDate:   [ '', [ Validators.required ] ],
    moneyType:     [ null, [ Validators.required ] ],
    amount:        [ null, [ Validators.required, Validators.min(1), Validators.pattern( numberPatt ) ] ],
    sourceAccount: [ '', [ Validators.pattern( fullTextPatt ) ] ],
    expenseType:   [ null, [ Validators.required ] ],
    areaCompanyId: [ null, [ Validators.required ] ],
    description:   [ '', [ Validators.pattern( descriptionPatt ) ] ],
    voucherId:     [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
  });

  inputErrors( field: string ) {
    return this.expenseForm.get(field)?.errors ?? null;
  }


  get file() { return this._file; }
  get isHavePhotoUpdated() { return this._isHavePhotoUpdated; }
  get formErrors() { return this.expenseForm.errors; }
  get isFormInvalid() { return this.expenseForm.invalid; }
  get exponseBody(): ExpenseBody { return  this.expenseForm.value as ExpenseBody; }

  isTouched( field: string ) {
    return this.expenseForm.get(field)?.touched ?? false;
  }

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {

    initFlowbite();
    this.onListenAuthRx();
    this.onGetExpenses();
    this.onLoadAreasAndNomenclatures();

  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetExpenses( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiExpense && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._expenseService.getExpenses( page, filter )
    .subscribe({
      next: ({ expenses, total }) => {

        this._totalExpenses.set( total );
        this._expenses.set( expenses );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onLoadAreasAndNomenclatures() {

    forkJoin({
      moneyTypes: this._nomenclatureService.getMoneyType(),
      expenseType: this._nomenclatureService.getExpensesType(),
      areasCompany: this._areaCompanyService.getAreasCompany( 1, '', 20 )
    }).subscribe( ( { moneyTypes, expenseType, areasCompany } ) => {

      const { areasComapny } = areasCompany;

      this._moneyTypes.set( moneyTypes.nomenclatures );
      this._expenseTypes.set( expenseType.nomenclatures );
      this._areasCompany.set( areasComapny );

    } );

  }

  onLoadToUpdate( expense: Expense ) {
    this._alertService.showLoading();

    this._expenseService.getExpenseById( expense.id )
    .subscribe({
      next: (expenseById) => {

        const { createAt, isActive, userCreate, photo, areaCompany, ...rest } = expenseById;

        this.expenseForm.reset({
          ...rest,
          areaCompanyId: areaCompany.id
        });
        this.fileUrl.set( photo?.urlImg || environments.defaultImgUrl );
        this._isHavePhotoUpdated = photo ? true : false ;
        this.expenseModalTitle = 'Actualizar egreso';
        this.btnShowExpenseModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  async onRemoveConfirm( expense: Expense ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar egreso de : "${ expense.moneyType } ${ formatNumber( expense.amount, 'en-US', '.2-2' ) }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeexpense( expense.id );
    }
  }

  private _removeexpense( expenseId: string ) {

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

    this._expenseService.removeExpense( expenseId )
    .subscribe({
      next: (userDeleted) => {
        this.onGetExpenses();
        this._isRemoving = false;
        this._alertService.showAlert('Egreso eliminado exitosamente', undefined, 'success');

      }, error: (err) => {
        this._isRemoving = false;
        this._alertService.close();
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

  onRemoveFile() {
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
  }

  onResetAfterSubmit() {
    this.expenseForm.reset();
    this.expenseModalTitle = 'Crear nuevo egreso';
    this._file = undefined;
    this.fileUrl.set( environments.defaultImgUrl );
  }

  onSubmit() {
    if( this.isFormInvalid || this.isSaving() ) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const { id, ...body } = this.exponseBody;

    const allowCreate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiExpense && permission.methods.includes( 'POST' )
    );

    if( !allowCreate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para crear un Egreso', 'warning');
      return;
    }

    this._alertService.showLoading();

    this._isSaving.set( true );

    if( !ISUUID( id ) ) {

      this._expenseService.createExpense( body )
      .subscribe({
        next: async ( paymentMethodCreated ) => {

          if( this._file ) {
            await this._uploadService.uploadFile( this._file, paymentMethodCreated.id, 'expenses' );
          }

          this.onResetAfterSubmit();
          this.btnCloseExpenseModal.nativeElement.click();
          this._alertService.showAlert('Egreso creado exitosamente', undefined, 'success');
          this.onGetExpenses();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiExpense && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un Egreso', 'warning');
      return;
    }

    this._expenseService.updateExpense( id ?? 'xD', body )
    .subscribe({
      next: async ( paymentMethodUpdated ) => {

        if( this._file ) {
          await this._uploadService.uploadFile( this._file, paymentMethodUpdated.id, 'expenses' );
        }

        this.btnCloseExpenseModal.nativeElement.click();
        this.onGetExpenses();

        this._alertService.showAlert('Egreso actualizado exitosamente', undefined, 'success');

      }, error: (err) => {
        this._isSaving.set( false);
      }
    });
  }

  ngOnDestroy(): void {
      this._authrx$?.unsubscribe();
  }

}
