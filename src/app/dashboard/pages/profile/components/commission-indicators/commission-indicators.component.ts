import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { validate as ISUUID } from 'uuid';

import { ProfileService } from '../../services/profile.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'commission-indicators',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './commission-indicators.component.html',
  styles: ``
})
export default class CommissionIndicatorsComponent implements OnInit {

  private _profileService = inject( ProfileService );

  private _isLoading = signal<boolean>( false );

  public isLoading = computed( () => this._isLoading() );

  private _sellerUserId = '';

  private _total = 0;
  private _totalPaid = 0;
  private _rest = 0;

  get totalCommissions() { return this._total; }
  get totalCommissionsPaid() { return this._totalPaid; }
  get totalCommissionsRest() { return this._rest; }

  ngOnInit(): void {

    this._sellerUserId = localStorage.getItem('userProfileId') ?? '';

    if( !ISUUID( this._sellerUserId ) ) throw new Error('userProfileId not found !!!');

    this.onGetCommisionsIndicators();

  }

  onGetCommisionsIndicators() {

    this._isLoading.set( true );

    this._profileService.getCommissionsIndicators( this._sellerUserId )
    .subscribe( ({ totalComissions, totalComissionsPaid, restComissionsForPaid, lastPayment }) => {

      this._total = totalComissions;
      this._totalPaid = totalComissionsPaid;
      this._rest = restComissionsForPaid;

      this._isLoading.set( false );

    });

  }

}
