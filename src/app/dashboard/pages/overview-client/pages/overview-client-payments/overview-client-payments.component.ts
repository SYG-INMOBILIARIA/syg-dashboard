import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AppState } from '@app/app.config';
import { PaymentQuote } from '@app/dashboard/interfaces';
import { DashboardClientService } from '@app/dashboard/services/dashboard-client.service';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

@Component({
  templateUrl: './overview-client-payments.component.html',
  styles: ``
})
export default class OverviewClientPaymentsComponent implements OnInit {

  private _authRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store );

  private _dashboardClientService = inject( DashboardClientService );

  private _clientId = signal<string | null>( null );

  private _payments = signal<PaymentQuote[]>( [] );
  private _total = signal<number>( 0 );

  private _isLoading = signal<boolean>( false );

  public payments = computed(() => this._payments());
  public total = computed(() => this._total());
  public isLoading = computed(() => this._isLoading());

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
          this.getPaymentsByClient();
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

  getPaymentsByClient( page = 1 ) {

    this._isLoading.set( true );

    this._dashboardClientService.getPaymentsByClient( 1, 10, this._clientId()! )
    .subscribe( {
      next: ( { payments, total } ) => {

        this._payments.set( payments );
        this._total.set( total );

      },
      error: () => {
        this._isLoading.set( false );
      },
      complete: () => {
        this._isLoading.set( false );
      }
    });

  }

}
