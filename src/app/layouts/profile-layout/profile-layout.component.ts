import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { validate as ISUUID } from 'uuid';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';

import { UserService } from '../../modules/security/services/user.service';
import { User } from '../../modules/security/interfaces';
import { AppState } from '../../app.config';
import * as profileActions from '@redux/actions/profile.actions';
import { forkJoin } from 'rxjs';
import { ProfileService } from '../../profile/services/profile.service';
import { environments } from '@envs/environments';

@Component({
  selector: 'profile-layout',
  templateUrl: './profile-layout.component.html',
  styles: ``,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ]
})
export default class ProfileLayoutComponent implements OnInit {

  private _router = inject( Router );
  private _userService = inject( UserService );
  private _profileService = inject( ProfileService );
  private _store = inject( Store<AppState> );

  private _userProfileName = signal<string | null>(null);
  private _userProfile = signal<User | null>(null);
  public defaultImg = environments.defaultImgUrl;

  private _isLoading = signal<boolean>(true);

  public userProfileName = computed( () => this._userProfileName() );
  public userProfile = computed( () => this._userProfile() );
  public isLoading = computed( () => this._isLoading() );

  private _sellerUserId = '';

  ngOnInit(): void {

    this._userProfileName.set( localStorage.getItem('userProfileName') );

    this._sellerUserId = localStorage.getItem('userProfileId') ?? '';

    if( !ISUUID( this._sellerUserId ) ) {
      this._router.navigateByUrl('/dashboard');
      return;
    }

    this.onGetUserProfile();

  }

  onGetUserProfile() {

    forkJoin({
      userProfile: this._userService.getUserById( this._sellerUserId ),
      paymentsIndicators: this._profileService.getSellerPaymentsIndicators( this._sellerUserId ),
    }).subscribe( ({ userProfile, paymentsIndicators }) => {

      const { totalCommissions, totalPayments, lastPayment } = paymentsIndicators;
      this._isLoading.set( false );
      this._userProfile.set( userProfile );

      this._store.dispatch( profileActions.onLoadUserProfile({ userProfile: userProfile }) );
      this._store.dispatch( profileActions.onLoadPaymentIndicators({ totalCommissions, totalPayments }) );

      if( lastPayment ){
        this._store.dispatch( profileActions.onLoadLastPayment({ lastPayment }) );
      }

    });
  }


}
