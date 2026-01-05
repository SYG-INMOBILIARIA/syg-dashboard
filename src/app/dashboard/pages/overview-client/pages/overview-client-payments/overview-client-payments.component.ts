import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AppState } from '@app/app.config';
import { ContractQuote } from '@modules/admin/interfaces';
import { ContractQuoteService } from '@modules/admin/services/contract-quote.service';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

@Component({
  templateUrl: './overview-client-payments.component.html',
  styles: ``
})
export default class OverviewClientPaymentsComponent implements OnInit, OnDestroy {

  private _authRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store );

  private _contractQuoteService = inject( ContractQuoteService );

  private _clientId = signal<string | null>( null );

  private _contractQuotesPayment = signal<ContractQuote[]>( [] );
  private _total = signal<number>( 0 );

  private _isLoading = signal<boolean>( false );

  public contractQuotesPayment = computed(() => this._contractQuotesPayment());
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

    this._contractQuoteService.getContractQuoteByClient( 1, 10, this._clientId()!, undefined, true )
    .subscribe( {
      next: ( { contractQuotes, total } ) => {

        this._contractQuotesPayment.set( contractQuotes );
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

  ngOnDestroy(): void {
    this._authRx$?.unsubscribe();
  }

}
