import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { Store } from '@ngrx/store';
import { initFlowbite } from 'flowbite';

import { AppState } from '@app/app.config';
import { Client, ClientStatus, Contract } from '@modules/admin/interfaces';
import { ContractService } from '@modules/admin/services/contract.service';
import { ProfileClientService } from '@app/dashboard/services/profile-client.service';

@Component({
  templateUrl: './client-info.component.html',
  styles: ``
})
export class ClientInfoComponent implements OnInit, OnDestroy {

  private _clientProfileRx$?: Subscription;

  private _contractService = inject( ContractService );
  private _profileClientService = inject( ProfileClientService );

  private _store = inject<Store<AppState>>( Store<AppState> );

  public readonly FINALIZED = ClientStatus.Finalized;
  public readonly PENDING = ClientStatus.Pending;
  public readonly NOT_FINALIZED = ClientStatus.NotFinalized;

  private _client = signal<Client | null>( null );
  private _lastPayment = signal<Date | string | null>( null );
  private _contracts = signal<Contract[]>( [] );
  private _totalContracts = signal<number>( 0 );
  private _isLoading = signal<boolean>( false );
  private _totalDebt = signal<number>( 0 );
  private _totalPaid = signal<number>( 0 );
  private _countOverdueDebt = signal<number>( 0 );

  public client = computed( () => this._client() );
  public contracts = computed( () => this._contracts() );
  public lastPayment = computed( () => this._lastPayment() );
  public totalContracts = computed( () => this._totalContracts() );
  public totalDebt = computed( () => this._totalDebt() );
  public totalPaid = computed( () => this._totalPaid() );
  public countOverdueDebt = computed( () => this._countOverdueDebt() );

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

    forkJoin({
      listContractResponse: this._contractService.getContractsByClient( this._client()!.id ),
      indicatorsResponse: this._profileClientService.getClientIndicators( this._client()!.id )
    })
    .subscribe( ({ listContractResponse, indicatorsResponse }) => {

      this._contracts.set( listContractResponse.contracts );
      this._totalContracts.set( listContractResponse.total );

      const { debtIndicators, paymentIndicators } = indicatorsResponse;

      const { totalDebt, totalPaid, countOverdueDebt } = debtIndicators.reduce<{ totalDebt: number; totalPaid: number; countOverdueDebt: number }>( (acc, current) => {

        acc.totalDebt += (current.loteAmount + current.interestAmount);
        acc.totalPaid += (current.totalPaid + current.initialAmount);
        acc.totalPaid += current.countOverdueDebt;

        return acc;
      }, { totalDebt: 0, totalPaid: 0, countOverdueDebt: 0 });

      this._totalDebt.set( totalDebt );
      this._totalPaid.set( totalPaid );

      this._lastPayment.set( paymentIndicators.lastPayment );
      this._countOverdueDebt.set( countOverdueDebt );

    });
  }

  ngOnDestroy(): void {
    this._clientProfileRx$?.unsubscribe();
  }

}
