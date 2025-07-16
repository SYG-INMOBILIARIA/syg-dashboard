import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AppState } from '@app/app.config';
import { ContractQuote } from '@modules/admin/interfaces';
import { ContractQuoteService } from '@modules/admin/services/contract-quote.service';
import { Store } from '@ngrx/store';
import { PipesModule } from '@pipes/pipes.module';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-overview-client-debts',
  standalone: true,
  imports: [
    CommonModule,
    PipesModule
  ],
  templateUrl: './overview-client-debts.component.html',
  styles: ``
})
export default class OverviewClientDebtsComponent implements OnInit, OnDestroy {

  private _authRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store );

  private _clientId = signal<string | null>( null );

  private _contractQuoteService = inject( ContractQuoteService );

  private _debts = signal<ContractQuote[]>( [] );
  private _total = signal<number>( 0 );

  private _isLoading = signal<boolean>( false );

  public debts = computed(() => this._debts());
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
          this.getDebtsByClient();
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

  getDebtsByClient( page = 1 ) {

    this._isLoading.set( true );

    this._contractQuoteService.getContractQuoteByClient( page, 10, this._clientId()!, true )
    .subscribe( {

      next: ( { contractQuotes, total } ) => {
        this._debts.set( contractQuotes );
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
