import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AppState } from '@app/app.config';
import { DashboardClientService } from '@app/dashboard/services/dashboard-client.service';
import { ContractDetailModalComponent } from '@modules/admin/components/contract-detail-modal/contract-detail-modal.component';
import { Contract } from '@modules/admin/interfaces';
import { on, Store } from '@ngrx/store';
import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { initFlowbite } from 'flowbite';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-overview-client-contracts',
  standalone: true,
  imports: [
    CommonModule,
    PipesModule,
    PaginationComponent,
    ContractDetailModalComponent
  ],
  templateUrl: './overview-client-contracts.component.html',
  styles: ``
})
export default class OverviewClientContractsComponent implements OnInit, OnDestroy {

  @ViewChild('btnShowDetailContractModal') btnShowDetailContractModal!: ElementRef<HTMLButtonElement>;

  private _authRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store );

  private _clientId = signal<string | null>( null );

  private _contracts = signal<Contract[]>( [] );
  private _total = signal<number>( 0 );
  private _isLoading = signal<boolean>( false );

  public contracts = computed(() => this._contracts());
  public total = computed(() => this._total());
  public isLoading = computed(() => this._isLoading());

  private _dashboardClientService = inject( DashboardClientService );

  private _contractIdByModal = signal< string | null >( null );
  public contractIdByModal = computed( () => this._contractIdByModal() );

  ngOnInit(): void {
    this._listenAuthRx();
    initFlowbite();
  }

  private _listenAuthRx() {
    this._authRx$ = this._store.select('auth').subscribe( state  => {
      const { userAuthenticated } = state;

      if ( userAuthenticated ) {
        const { client } = userAuthenticated;

        if ( client ) {
          this._clientId.set( client.id );
          this.onGetContracts();
        } else {
          this._authRx$?.unsubscribe();
          throw new Error('Client not found!!!');
        }
      } else {
        this._authRx$?.unsubscribe();
        throw new Error('User not authenticated!!!');
      }

    });
  }

  onGetContracts( page = 1 ): void {

    const clientId = this._clientId();
    if ( !clientId ) return;

    this._isLoading.set( true );

    this._dashboardClientService.getContractsByClient( page, 5, '', clientId )
    .subscribe( ( { contracts, total } ) => {

      this._contracts.set( contracts );
      this._total.set( total );

      this._isLoading.set( false );

    });
  }

  onShowDetailModal( contract: Contract ) {

    const { id } = contract;

    this._contractIdByModal.set( id );

    this.btnShowDetailContractModal.nativeElement.click();
  }

  ngOnDestroy(): void {
    this._authRx$?.unsubscribe();
  }

}
