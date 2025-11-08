import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ProfileService } from '../../services/profile.service';
import { validate as ISUUID } from 'uuid';
import { Income, PendingReceivable } from '../../interfaces';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'seller-indicators',
  templateUrl: './seller-indicators.component.html',
  standalone: true,
  imports: [
    CommonModule
  ],
  styles: ``,
})
export default class SellerIndicatorsComponent implements OnInit {

  private readonly _profileService = inject( ProfileService );

  private _totalIncome = signal<number>( 0 );
  private _totalClients = signal<number>( 0 );
  private _percentLastMonthIncome = signal<number>( 0 );
  private _percentPreviusMonthClients = signal<number>( 0 );
  private _totalEarnings = signal<number>( 0 );


  private _totalReceivable = signal<number>( 0 );
  private _percentLastMonthReceivable = signal<number>( 0 );
  private _sellerUserId = '';

  public totalIncome = computed( () => this._totalIncome() );
  public totalClients = computed( () => this._totalClients() );
  public percentLastMonthIncome = computed( () => this._percentLastMonthIncome() );
  public percentPreviusMonthClients = computed( () => this._percentPreviusMonthClients() );
  public totalEarnings = computed( () => this._totalEarnings() );
  public totalReceivable = computed( () => this._totalReceivable() );
  public percentLastMonthReceivable = computed( () => this._percentLastMonthReceivable() );

  ngOnInit(): void {

    this._sellerUserId = localStorage.getItem('userProfileId') ?? '';
    if( !ISUUID( this._sellerUserId ) ) throw new Error('userProfileId not found !!!');
    this.onGetIndicators();

  }

  onGetIndicators() {

    this._profileService.getSellerIndicators( this._sellerUserId )
    .subscribe( ( { income, pendingReceivable, totalEarnings, clientsBySeller } ) => {

      const { sumCurrentMonth, sumLastMonth } = income;
      const { pendingCurrentReceivable, pendingLastMonthReceivable } = pendingReceivable;
      const { currentMonth, previousMonth  } = clientsBySeller;
      // this._income.set( income );

      this._totalIncome.set( sumCurrentMonth ?? 0 );
      this._percentLastMonthIncome.set( sumLastMonth == 0 ? 0 : ( 100 * sumCurrentMonth  ) / sumLastMonth );

      this._totalClients.set( currentMonth.totalClients );
      this._percentPreviusMonthClients.set( currentMonth.totalClients == 0 ? 0 : ( 100 * currentMonth.totalClients  ) / previousMonth.totalClients );

      let totalReceivable = pendingCurrentReceivable - sumCurrentMonth;
      this._totalReceivable.set( totalReceivable );
      this._percentLastMonthReceivable.set( pendingLastMonthReceivable == 0 ? totalReceivable : ( totalReceivable * pendingLastMonthReceivable ) / 100 );

      this._totalEarnings.set( totalEarnings );
    });

  }

}
