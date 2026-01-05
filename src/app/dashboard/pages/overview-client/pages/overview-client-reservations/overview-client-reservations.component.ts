import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AppState } from '@app/app.config';
import { DashboardClientService } from '@app/dashboard/services/dashboard-client.service';
import { Reservation } from '@modules/admin/pages/reservation/interfaces';
import { Store } from '@ngrx/store';
import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-overview-client-reservations',
  standalone: true,
  imports: [
    CommonModule,
    PipesModule,
    PaginationComponent
  ],
  templateUrl: './overview-client-reservations.component.html',
  styles: ``
})
export default class OverviewClientReservationsComponent implements OnInit, OnDestroy {

  private _authRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store );

  private _clientId = signal<string | null>( null );

  private _reservations = signal<Reservation[]>( [] );
  private _total = signal<number>( 0 );
  private _isLoading = signal<boolean>( false );

  public reservations = computed(() => this._reservations());
  public total = computed(() => this._total());
  public isLoading = computed(() => this._isLoading());

  private _dashboardClientService = inject( DashboardClientService );

  ngOnInit(): void {
    this._listenAuthRx();
  }

  private _listenAuthRx() {
    this._authRx$ = this._store.select('auth').subscribe( state  => {
      const { userAuthenticated } = state;

      if ( userAuthenticated ) {
        const { client } = userAuthenticated;

        if ( client ) {
          this._clientId.set( client.id );
          this.onGetReservations();
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

  onGetReservations( page = 1 ): void {

    const clientId = this._clientId();
    if ( !clientId ) return;

    this._isLoading.set( true );

    this._dashboardClientService.getReservationsByClient( page, 5, '', clientId )
    .subscribe( ( { reservations, total } ) => {

      this._reservations.set( reservations );
      this._total.set( total );

      this._isLoading.set( false );

    });
  }

  onShowDetailModal( reservation: Reservation ) {

  }


  ngOnDestroy(): void {

  }

}
