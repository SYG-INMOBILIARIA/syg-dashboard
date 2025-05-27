import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ContractService } from '../../services/contract.service';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { AlertService } from '@shared/services/alert.service';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { Contract, Schedule } from '../../interfaces';
import { PipesModule } from '@pipes/pipes.module';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, forkJoin } from 'rxjs';
import { Store } from '@ngrx/store';

import { Nomenclature } from '@shared/interfaces';
import { ContractDetailModalComponent } from '../../components/contract-detail-modal/contract-detail-modal.component';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiContract } from '@shared/helpers/web-apis.helper';
import { RouterModule } from '@angular/router';
import { initFlowbite } from 'flowbite';

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
    RouterModule
  ],
  templateUrl: './contracts.component.html',
  styles: ``
})
export default class ContractsComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods = signal<WebUrlPermissionMethods[]>([]);

  private _dialog$?: Subscription;

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
  private _contractSchedule = signal<Schedule[]>( [] );

  public contractSchedule = computed( () => this._contractSchedule() );
  public downloadInProgress = computed( () => this._downloadInProgress() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public allowList = computed( () => this._allowList() );
  public totalContracts = computed( () => this._totalContracts() );
  public contracts = computed( () => this._contracts() );
  public contractById = computed( () => this._contractById() );
  public contractIdByModal = computed( () => this._contractIdByModal() );
  public lotes = computed( () => this._contractById()?.lotes ?? [] );
  public client = computed( () => this._contractById()?.client );
  public webUrlPermissionMethods = computed( () => this._webUrlPermissionMethods() );

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  get lotesAmount() {
    return this.contractById()?.loteAmount ?? 0;
  }

  get interestPercent() {
    return this.contractById()?.interestPercent ?? 0;
  }

  get amountToFinancing() {
    return this.contractById()?.amountToFinancing ?? 0;
  }

  get amountToQuota() {
    return this.contractById()?.quotesAmount ?? 0;
  }

  get numberOfQuotes() {
    return this.contractById()?.numberOfQuotes ?? 0;
  }

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

  onRemoveConfirm( contract: Contract ) {

  }

  onShowDetailModal( contract: Contract ) {

    const { id } = contract;

    this._contractIdByModal.set( id );

    this.btnShowDetailContractModal.nativeElement.click();
  }

  onShowScheduleModal( contract: Contract ) {

    this._contractById.set( contract );

    this._contractService.getPaymentScheduleByContract( contract.id )
    .subscribe( ({ schedule }) => {

      this._contractSchedule.set( schedule );
      this.btnShowScheduleContractModal.nativeElement.click();
    });

  }

  async onDonwloadSchedule() {

    if( this.downloadInProgress() ) return;

    this._downloadInProgress.set( true );
    await this._contractService.getDowlandPaymentSchedule('scheduleContractdiv');
    this._downloadInProgress.set( false);
  }

  ngOnDestroy(): void {
    this._dialog$?.unsubscribe();
    this._authrx$?.unsubscribe();
  }

}
