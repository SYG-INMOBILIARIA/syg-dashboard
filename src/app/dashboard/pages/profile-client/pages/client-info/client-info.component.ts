import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { Store } from '@ngrx/store';
import { initFlowbite } from 'flowbite';

import { AppState } from '@app/app.config';
import { Client, ClientStatus, Contract, ContractQuote } from '@modules/admin/interfaces';
import { ContractService } from '@modules/admin/services/contract.service';
import { ProfileClientService } from '@app/dashboard/services/profile-client.service';

@Component({
  templateUrl: './client-info.component.html',
  styles: ``
})
export class ClientInfoComponent implements OnInit, OnDestroy {

  @ViewChild('btnShowDetailContractModal') btnShowDetailContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowScheduleContractModal') btnShowScheduleContractModal!: ElementRef<HTMLButtonElement>;

  private _clientProfileRx$?: Subscription;

  private _contractService = inject( ContractService );
  private _profileClientService = inject( ProfileClientService );

  private _store = inject<Store<AppState>>( Store<AppState> );

  public readonly FINALIZED = ClientStatus.Finalized;
  public readonly PENDING = ClientStatus.Pending;
  public readonly NOT_FINALIZED = ClientStatus.NotFinalized;


  private _client = signal<Client | null>( null );
  private _contractIdByModal = signal<string | null>( null );
  private _lastPayment = signal<Date | string | null>( null );
  private _contracts = signal<Contract[]>( [] );
  private _totalContracts = signal<number>( 0 );
  private _isLoading = signal<boolean>( false );
  private _totalDebt = signal<number>( 0 );
  private _totalPaid = signal<number>( 0 );
  private _countOverdueDebt = signal<number>( 0 );

  private _contractById = signal< Contract | null >( null );
  private _contractQuotes = signal<ContractQuote[]>( [] );

  public client = computed( () => this._client() );
  public contractIdByModal = computed( () => this._contractIdByModal() );
  public contracts = computed( () => this._contracts() );
  public lastPayment = computed( () => this._lastPayment() );
  public totalContracts = computed( () => this._totalContracts() );
  public totalDebt = computed( () => this._totalDebt() );
  public totalPaid = computed( () => this._totalPaid() );
  public countOverdueDebt = computed( () => this._countOverdueDebt() );

  public contractById = computed( () => this._contractById() );
  public lotes = computed( () => this._contractById()?.lotes ?? [] );
  public contractQuotes = computed( () => this._contractQuotes() );

  public isLoading = computed( () => this._isLoading() );

  ngOnInit(): void {
    initFlowbite();
    this.onClientProfileListen();
  }

  onClientProfileListen() {

    this._clientProfileRx$ = this._store.select('profile_client')
    .subscribe( (state) => {

      const { client, isLoading } = state;

      this._client.set( client );
      this._isLoading.set( isLoading );

      if( client != null ) {
        this.onGetContractsByClient();
      }

    });

  }

  onGetContractsByClient() {

    if( !this._client() ) throw new Error('Client undefined!!!');

    const clientId = this._client()!.id;

    forkJoin({
      listContractResponse: this._contractService.getContractsByClient( clientId ),
      indicatorsResponse: this._profileClientService.getClientIndicators( clientId )
    })
    .subscribe( ({ listContractResponse, indicatorsResponse }) => { //indicatorsResponse

      this._contracts.set( listContractResponse.contracts );
      this._totalContracts.set( listContractResponse.total );

      const { debtIndicators, paymentIndicators } = indicatorsResponse;

      this._totalDebt.set( debtIndicators.totalDebt );
      this._totalPaid.set( debtIndicators.totalPaid );

      this._lastPayment.set( paymentIndicators.lastPayment );
      this._countOverdueDebt.set( debtIndicators.countOverdueDebt );

      setTimeout(() => {
        initFlowbite();
      }, 400);

    });
  }

  onShowDetailModal( contract: Contract ) {

    const { id } = contract;

    this._contractIdByModal.set( id );

    this.btnShowDetailContractModal.nativeElement.click();
  }

  onShowScheduleModal( contract: Contract ) {

    this._contractById.set( contract );

    this._contractService.getPaymentScheduleByContract( contract.id )
    .subscribe( ({ contractQuotes }) => {

      this._contractQuotes.set( contractQuotes );
      this.btnShowScheduleContractModal.nativeElement.click();
    });

  }

  ngOnDestroy(): void {
    this._clientProfileRx$?.unsubscribe();
  }

}
