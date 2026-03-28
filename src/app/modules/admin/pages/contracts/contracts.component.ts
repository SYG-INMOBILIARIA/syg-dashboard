import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ContractService } from '../../services/contract.service';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { AlertService } from '@shared/services/alert.service';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { Contract, ContractQuote } from '../../interfaces';
import { PipesModule } from '@pipes/pipes.module';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { ContractDetailModalComponent } from '../../components/contract-detail-modal/contract-detail-modal.component';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiContract } from '@shared/helpers/web-apis.helper';
import { RouterModule } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { PaymentScheduleModalComponent } from '@modules/admin/components/payment-schedule-modal/payment-schedule-modal.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { ExcelExportService } from '@shared/services/excel-export.service';
import { MomentPipe } from '@pipes/moment.pipe';
import { PaymentTypePipe } from '@pipes/payment-type.pipe';

import { NomenclatureService } from '@shared/services/nomenclature.service';
import { Nomenclature } from '@shared/interfaces';
import { NgSelectModule } from '@ng-select/ng-select';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { WritingStatusBody } from './interfaces';
import { DateFilterMode } from './services/contract-filter-validator.service';
import { FlatpickrDefaultsInterface, FlatpickrDirective } from 'angularx-flatpickr';
import moment from 'moment';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PaginationComponent,
    ContractDetailModalComponent,
    PaymentScheduleModalComponent,
    RouterModule,
    SpinnerComponent,
    PipesModule,
    NgSelectModule,
    FlatpickrDirective,
    InputErrorsDirective
  ],
  providers: [
    MomentPipe,
    PaymentTypePipe
  ],
  templateUrl: './contracts.component.html',
  styles: ``
})
export default class ContractsComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _dateModeFilterField$?: Subscription;
  private _rangeDateFilterField$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods = signal<WebUrlPermissionMethods[]>([]);

  @ViewChild('btnCloseContractModal') btnCloseContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowContractModal') btnShowContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowDetailContractModal') btnShowDetailContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowScheduleContractModal') btnShowScheduleContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowWritingStatusModal') btnShowWritingStatusModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnCloseWritingStatusMethodModal') btnCloseWritingStatusMethodModal!: ElementRef<HTMLButtonElement>;

  private _alertService = inject( AlertService );
  private _contractService = inject( ContractService );
  private _excelExportService = inject( ExcelExportService );
  private _momentPipe = inject( MomentPipe );
  private _paymentPipe = inject( PaymentTypePipe );
  private _nomenclatureService = inject( NomenclatureService );
  readonly dialog = inject( MatDialog );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public chkExpiredQuotesInput = new FormControl(false, []);

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _allowList = signal( true );
  private _reportInProgress = signal( false );
  private _totalContracts = signal<number>( 0 );
  private _contracts = signal<Contract[]>( [] );
  private _contractIdByModal = signal< string | null >( null );
  private _contractById = signal< Contract | null >( null );
  private _contractSchedule = signal<ContractQuote[]>( [] );
  private _writingStatuses = signal<Nomenclature[]>( [] );

  public flatpickrOptions: FlatpickrDefaultsInterface = {
    clickOpens: true,
    maxDate: new Date(),
  };

  public flatpickrOptionsRange: FlatpickrDefaultsInterface = {
    clickOpens: true,
    maxDate: new Date(),
    mode: 'range',
  };

  public reportInProgress = computed( () => this._reportInProgress() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public allowList = computed( () => this._allowList() );
  public totalContracts = computed( () => this._totalContracts() );
  public contracts = computed( () => this._contracts() );
  public contractIdByModal = computed( () => this._contractIdByModal() );
  public contractById = computed( () => this._contractById() );
  public lotes = computed( () => this._contractById()?.lotes ?? [] );
  public contractSchedule = computed( () => this._contractSchedule() );
  public webUrlPermissionMethods = computed( () => this._webUrlPermissionMethods() );
  public writingStatuses = computed( () => this._writingStatuses() );

  private _fb = inject( UntypedFormBuilder );
  public writingForm = this._fb.group({
    contractId:       [ null, [ Validators.required ] ],
    writingStatus:    [ null, [ Validators.required ] ],
  });

  public contractFilterForm = this._fb.group({
    labelDate:  [ '' ],
    dateMode: ['none', [ Validators.required ]],

    equalToDate:  [null],
    rangeToDate:   [null],

    greaterToDate:   [null],
    lessToDate:   [null],
  });


  private _dateMode = signal<DateFilterMode>( 'none' );
  public selectedDateMode = computed(
    () => this._dateMode()
  );

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  inputErrors( field: string ) {
    return this.writingForm.get(field)?.errors ?? null;
  }

  isTouched( field: string ) {
    return this.writingForm.get(field)?.touched ?? false;
  }

  filterInputErrors( field: string ) {
    return this.contractFilterForm.get(field)?.errors ?? null;
  }

  isTouchedFilters( field: string ) {
    return this.contractFilterForm.get(field)?.touched ?? false;
  }

  get isFormInvalid() { return this.writingForm.invalid; }
  get writingStatusBody(): WritingStatusBody { return  this.writingForm.value as WritingStatusBody; }

  public showDateDropdown = false;

  ngOnInit(): void {
    this.onListenAuthRx();
    this.onGetContracts();
    this.onGetWritingStatus();

    this.onListenChangeFiltersValues();
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods.set( webUrlPermissionMethods );
    });
  }

  onListenChangeFiltersValues() {

    this._dateModeFilterField$ = this.contractFilterForm.get('dateMode')?.valueChanges
    .subscribe((mode: DateFilterMode) => {

      const equalToDateCtrl = this.contractFilterForm.get('equalToDate');
      const rangeToDateCtrl = this.contractFilterForm.get('rangeToDate');

      equalToDateCtrl?.clearValidators();
      rangeToDateCtrl?.clearValidators();

      let validatorsEqual = [ Validators.required ];
      let validatorsRange = [ Validators.required ];

      switch (mode) {
        case 'equal':
          this.contractFilterForm.patchValue({
            greaterToDate: null,
            lessToDate: null,
          }, { emitEvent: false });
          validatorsRange = [];
          break;

          case 'range':
            this.contractFilterForm.patchValue({
              equalToDate: null,
            }, { emitEvent: false });
            validatorsEqual = [];
          break;

        default:
          this.contractFilterForm.patchValue({
            equalToDate: null,
            greaterToDate: null,
            lessToDate: null,
          }, { emitEvent: false });

          validatorsEqual = [];
          validatorsRange = [];
          break;
      }

      equalToDateCtrl?.addValidators( validatorsEqual )
      rangeToDateCtrl?.addValidators( validatorsRange )

      equalToDateCtrl?.updateValueAndValidity({ emitEvent: false });
      rangeToDateCtrl?.updateValueAndValidity({ emitEvent: false });

      this._dateMode.set( mode );

      this.contractFilterForm.updateValueAndValidity();
    });

    this._rangeDateFilterField$ = this.contractFilterForm.get('rangeToDate')?.valueChanges.subscribe((value) => {
      if (!value) {
        this.contractFilterForm.patchValue({
          greaterToDate: null,
          lessToDate: null,
        }, { emitEvent: false });
        return;
      }

      const [from, to] = String(value).split(' a ');

      this.contractFilterForm.patchValue({
        greaterToDate: from ?? null,
        lessToDate: to ?? null,

        labelDate: moment( from ).format('DD [de] MMM YYYY') + ' a ' + moment( to ).format('DD [de] MMM YYYY')
      }, { emitEvent: false });
    });

  }

  toggleDateDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.showDateDropdown = !this.showDateDropdown;
  }

  onGetContracts( page = 1 ) {

    const webUrlPermissionMethods = this._webUrlPermissionMethods();

    const allowList = webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiContract && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    const filterQuery = this.buildFilterQuery();

    this._alertService.showLoading();
    this.showDateDropdown = false;

    this._isLoading.set( true );
    this._contractService.getContracts( page, filterQuery )
    .subscribe({
      next: ({ contracts, total }) => {

        this._totalContracts.set( total );
        this._contracts.set( contracts );
        this._isLoading.set( false );

        setTimeout(() => {
          initFlowbite();
        }, 400);
        this._alertService.close();

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  get filterFormInvalid() {
    return this.contractFilterForm.invalid;
  }

  get filterBody() {
    return this.contractFilterForm.getRawValue();
  }


  onClearFilters() {
    this.contractFilterForm.reset({
      labelDate: '',
      dateMode: 'none',
      equalToDate: null,
      rangeToDate: null,
      greaterToDate: null,
      lessToDate: null,
    });
    this.showDateDropdown = false;
    this.onGetContracts();
  }

  private buildFilterQuery(): string {

    const searchText = this.searchInput.value ?? '';
    const chkExpired = this.chkExpiredQuotesInput.value ?? '';
    const { dateMode, equalToDate, greaterToDate, lessToDate } = this.filterBody;

    const filters: string[] = [
      `clientPattern=${searchText ?? ''};expiredQuotes=${ chkExpired }`,
    ];

    if (dateMode === 'equal' && equalToDate) {
      filters.push(`createdAt=${equalToDate}`);
    }

    if (dateMode === 'range' && greaterToDate && lessToDate) {
      filters.push(`createdFrom=${greaterToDate}`);
      filters.push(`createdTo=${lessToDate}`);
    }

    return filters.join(';');
  }

  onGetWritingStatus() {
    this._nomenclatureService.getWritingStatus()
    .subscribe( ( { nomenclatures } ) => {
      this._writingStatuses.set( nomenclatures );
    });
  }


  async onRemoveConfirm( contract: Contract ) {

    const responseConfirm = await this._alertService.showConfirmAlert(
      'Se eliminarán quotas y pagos de cuotas',
      `¿Está seguro de eliminar contrato #"${ contract.code }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeContract( contract.id );
    }
  }

  private _removeContract( contractId: string ) {

    this._alertService.showLoading();

    this._contractService.deleteContract( contractId )
    .subscribe( (contractDeleted) => {

      this._alertService.showAlert(`Contrato ${ contractDeleted.code }, eliminado exitosamente.`, undefined, 'success');

      this.onGetContracts();

    });

  }

  onShowDetailModal( contract: Contract ) {

    const { id } = contract;

    this._contractIdByModal.set( id );

    this.btnShowDetailContractModal.nativeElement.click();
  }

  onShowScheduleModal( contract: Contract ) {

    this._alertService.showLoading();
    this._contractById.set( contract );

    this._contractService.getPaymentScheduleByContract( contract.id )
    .subscribe( ({ contractQuotes }) => {

      this._contractSchedule.set( contractQuotes );
      this.btnShowScheduleContractModal.nativeElement.click();
      this._alertService.close();
    });

  }

  onExportContracts() {
    if( this._reportInProgress() ) return;

    this._reportInProgress.set( true );

    const filter = this.searchInput.value ?? '';
    this._contractService.getContracts( 1, filter, 1000 )
    .subscribe({
      next: ({ contracts }) => {

        const dataToExport = contracts.map( (contract) => ({
        'Cliente/Customer': contract.clients.map( (client) => client.fullname ).join(' - '),
        'Código': contract.code,
        'Proyecto': contract.proyect.name,
        'Lotes': contract.lotes.map( ( lote ) => `${ lote.mz }${ lote.numberLote }` ).join( ' - ' ),
        'Tipo de pago': this._paymentPipe.transform( contract.paymentType ),
        'F. creación': this._momentPipe.transform( contract.createAt ),
        'F. primer pago': contract.firstPayDate ? this._momentPipe.transform( contract.firstPayDate ) : '',
      }));

      this._excelExportService.exportToExcel( dataToExport, 'Contratos' );

      this._reportInProgress.set( false );

      }, error: (err) => {
        this._reportInProgress.set( false );
      }
    });



  }

  onResetWritingStatusForm() {
    this.writingForm.reset();
    this._contractById.set( null );
  }

  onSubmitWritingStatusSubmit() {

    if( this.isFormInvalid ) {
      this.writingForm.markAllAsTouched();
      return;
    }

    this._isSaving.set( true );
    const { contractId, writingStatus } = this.writingStatusBody;

    this._contractService.updateWritingStatus( contractId!, { writingStatus: writingStatus! } )
    .subscribe(( contractUpdated ) => {
      this._isSaving.set( false );
      this._alertService.showAlert(`Estado de escritura actualizado en contrato #${ contractUpdated.code }`, undefined, 'success');
      this.btnCloseWritingStatusMethodModal.nativeElement.click();
      this.onGetContracts();
    });

  }

  onShowWritingStatusModal( contract: Contract ) {
    this.writingForm.reset({
      contractId: contract.id,
      writingStatus: contract.writingStatus ?? null,
    });
    this._contractById.set( contract );
    this.btnShowWritingStatusModal.nativeElement.click();
  }

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
    this._dateModeFilterField$?.unsubscribe();
    this._rangeDateFilterField$?.unsubscribe();
  }

}
