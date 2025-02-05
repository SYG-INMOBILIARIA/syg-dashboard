import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { AuthState, } from '@redux/reducers/auth.reducer';
import { AuthService } from '../../../auth/services/auth.service';
import { UserAuthenticated } from '../../../auth/interfaces';
import { AppState } from '../../../app.config';

@Component({
  selector: 'user-menu-dropdown',
  standalone: true,
  imports: [],
  templateUrl: './user-menu-dropdown.component.html',
  styles: ``
})
export class UserMenuDropdownComponent implements OnInit, OnDestroy {

  private _authRx$?: Subscription;

  private _authService = inject( AuthService );
  private _store = inject( Store<AppState> );

  private _userAutenticated = signal<UserAuthenticated | null>( null );
  public userAutenticated = computed( () => this._userAutenticated() );

  ngOnInit(): void {
    this.onListenAuthRx();
  }

  onListenAuthRx() {
    this._authRx$ = this._store.select('auth')
    .subscribe( (state: AuthState) => {

      const { userAuthenticated } = state;

      this._userAutenticated.set( userAuthenticated );
    });
  }

  onSingOut() {
    this._authService.onSingOut();
  }

  ngOnDestroy(): void {
    this._authRx$?.unsubscribe();
  }

}
