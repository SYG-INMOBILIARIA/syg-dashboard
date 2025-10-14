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

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PaginationComponent,
    PipesModule,
    ContractDetailModalComponent,
    PaymentScheduleModalComponent,
    RouterModule,
    SpinnerComponent
  ],
  templateUrl: './contracts.component.html',
  styles: ``
})
export default class ContractsComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods = signal<WebUrlPermissionMethods[]>([]);

  @ViewChild('btnCloseContractModal') btnCloseContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowContractModal') btnShowContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowDetailContractModal') btnShowDetailContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowScheduleContractModal') btnShowScheduleContractModal!: ElementRef<HTMLButtonElement>;

  private _alertService = inject( AlertService );
  private _contractService = inject( ContractService );
  readonly dialog = inject( MatDialog );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _allowList = signal( true );
  private _downloadInProgress = signal( false );
  private _totalContracts = signal<number>( 0 );
  private _contracts = signal<Contract[]>( [] );
  private _contractIdByModal = signal< string | null >( null );
  private _contractById = signal< Contract | null >( null );
  private _contractSchedule = signal<ContractQuote[]>( [] );

  public downloadInProgress = computed( () => this._downloadInProgress() );
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

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {

    this.onListenAuthRx();
    this.onGetContracts();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods.set( webUrlPermissionMethods );
    });
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

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._contractService.getContracts( page, filter )
    .subscribe({
      next: ({ contracts, total }) => {

        this._totalContracts.set( total );
        this._contracts.set( contracts );
        this._isLoading.set( false );

        setTimeout(() => {
          initFlowbite();
        }, 400);

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onLoadToUpdate( contract: Contract ) {

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

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
  }

}
