import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { validate as ISUUID } from 'uuid';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { PipesModule } from '@pipes/pipes.module';
import { ProfileService } from '../../services/profile.service';
import { AppState } from '@app/app.config';
import { SellerPayment } from '../../interfaces';
@Component({
  selector: 'payment-indicators',
  templateUrl: './payment-indicators.component.html',
  standalone: true,
  imports: [
    CommonModule,
    PipesModule
  ],
  styles: ``,
})
export default class PaymentIndicatorsComponent implements OnInit, OnDestroy {

  private _profileRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );

  private _profileService = inject( ProfileService );
  private _sellerUserId = '';

  private _totalPayments = signal<number>( 0 );
  private _totalCommissions = signal<number>( 0 );
  private _totalPending = signal<number>( 0 );
  private _lastPayment = signal<SellerPayment | null>( null );


  public totalPayments = computed( () => this._totalPayments() );
  public totalCommissions = computed( () => this._totalCommissions() );
  public totalPending = computed( () => this._totalPending() );
  public lastPayment = computed( () => this._lastPayment() );

  ngOnInit(): void {

    this._sellerUserId = localStorage.getItem('userProfileId') ?? '';

    if( !ISUUID( this._sellerUserId ) ) throw new Error('userProfileId not found !!!');

    this.onListenProfileRx();
  }

  onListenProfileRx() {
    this._profileRx$ = this._store.select('profile')
    .subscribe( ( { profits, lastPayment, totalCommissions, totalPayments } ) => {
      this._totalPending.set( profits );
      this._lastPayment.set( lastPayment );
      this._totalCommissions.set( totalCommissions );
      this._totalPayments.set( totalPayments );
    });
  }

  ngOnDestroy(): void {
    this._profileRx$?.unsubscribe();
  }

}
