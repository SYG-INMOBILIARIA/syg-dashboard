import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { AuthState, } from '@redux/reducers/auth.reducer';
import { AuthService } from '../../../auth/services/auth.service';
import { UserAuthenticated } from '../../../auth/interfaces';
import { AppState } from '@app/app.config';
import { Router, RouterModule } from '@angular/router';
import { environments } from '@envs/environments';

@Component({
  selector: 'user-menu-dropdown',
  standalone: true,
  imports: [
    RouterModule
  ],
  templateUrl: './user-menu-dropdown.component.html',
  styles: ``
})
export class UserMenuDropdownComponent implements OnInit, OnDestroy {

  // private _authRx$?: Subscription;
  // private _store = inject( Store<AppState> );

  private _router = inject( Router );
  private _authService = inject( AuthService );

  private _userAutenticated = signal<UserAuthenticated | null>( null );
  public userAutenticated = computed( () => this._userAutenticated() );

  public defaultFileUrl = signal( environments.defaultImgUrl );

  private _profileUrl = signal<string>( '/dashboard/profile' );

  get profileUrl() {
    return this._profileUrl();
  }

  ngOnInit(): void {

    const userAuthenticated = this._authService.personSession();

    this._userAutenticated.set( userAuthenticated );

    if ( userAuthenticated ) {

      const { client } = userAuthenticated;

      if ( client ) {

        this._profileUrl.set( '/dashboard/client-profile' );
        // this.onGetContractQuotes();
      }

    }

      // else {
      //   this._authRx$?.unsubscribe();
      // }

  }



  onSingOut() {
    this._authService.onSingOut();
  }

  onClearUserProfileID() {
    localStorage.removeItem('userProfileId');
    localStorage.removeItem('userProfileName');
    localStorage.removeItem('clientProfileId');


    this._router.navigateByUrl( this._profileUrl() );
  }

  ngOnDestroy(): void {
    // this._authRx$?.unsubscribe();
  }

}
