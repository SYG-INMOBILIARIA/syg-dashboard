import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, input, signal } from '@angular/core';
import { validate as ISUUID } from 'uuid';

import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'client-indicators',
  templateUrl: './client-indicators.component.html',
  standalone: true,
  imports: [
    CommonModule
  ],
  styles: ``
})
export default class ClientIndicatorsComponent implements OnInit {

  private _profileService = inject( ProfileService );

  private _totalClients = signal<number>( 0 );
  private _percentClients = signal<number>( 0 );

  private _totalFinalized = signal<number>( 0 );
  private _percentClientsFinalized = signal<number>( 0 );

  private _totalPending = signal<number>( 0 );
  private _percentClientsPending = signal<number>( 0 );

  private _percentRatio = signal<number>( 0 );
  private _percentRatioLast = signal<number>( 0 );

  private _sellerUserId = '';

  public totalClients = computed( () => this._totalClients() );
  public percentClients = computed( () => this._percentClients() );
  public totalFinalized = computed( () => this._totalFinalized() );

  public percentClientsFinalized = computed( () => this._percentClientsFinalized() );
  public totalPending = computed( () => this._totalPending() );
  public percentClientsPending = computed( () => this._percentClientsPending() );
  public percentRatio = computed( () => this._percentRatio() );
  public percentRatioLast = computed( () => this._percentRatioLast() );

  @Input() public set sellerUserId( value: string ) {

    if( !ISUUID( value ) ) throw new Error('sellerUserId is not valid UUID !!!');

    this._sellerUserId = value;
    this.onGetClientIndicators();
  }

  ngOnInit(): void {

  }

  onGetClientIndicators() {

    this._profileService.getClientIndicators( this._sellerUserId )
    .subscribe( ( { totalClients, totalClientsFinalized, totalClientsPending } ) => {

      this._totalClients.set( totalClients.countClientsCurrentMonth )

      this._percentClients.set(
        totalClients.countClientsLastMonth == 0
          ? totalClients.countClientsCurrentMonth
          : ( totalClients.countClientsCurrentMonth * totalClients.countClientsLastMonth ) / 100
      );

      this._totalFinalized.set( totalClientsFinalized.countClientsCurrentMonth )
      this._percentClientsFinalized.set(
        totalClientsFinalized.countClientsLastMonth == 0
          ? totalClientsFinalized.countClientsCurrentMonth
          : ( totalClientsFinalized.countClientsCurrentMonth * totalClientsFinalized.countClientsLastMonth ) / 100
      );

      this._totalPending.set( totalClientsPending.countClientsCurrentMonth )
      this._percentClientsPending.set(
        totalClientsPending.countClientsLastMonth == 0
          ? totalClientsPending.countClientsCurrentMonth
          : ( totalClientsPending.countClientsCurrentMonth * totalClientsPending.countClientsLastMonth ) / 100
      );

      this._percentRatio.set(
        ( totalClientsFinalized.countClientsCurrentMonth * totalClients.countClientsCurrentMonth ) / 100
      );

      // this._percentClientsPending.set(
      //   ( totalClientsFinalized.countClientsCurrentMonth * totalClients.countClientsCurrentMonth ) / 100
      // );

    });

  }

}
