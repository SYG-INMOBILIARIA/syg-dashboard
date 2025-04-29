import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { AppState } from '../../../app.config';
import { UserAuthenticated } from '../../../auth/interfaces';

@Component({
  selector: 'app-home-profile',
  templateUrl: './home-profile.component.html',
  styles: ``,

})
export class HomeProfileComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );

  private _userAuthenticated = signal<UserAuthenticated | null>(null);
  public userAuthenticated = computed( () => this._userAuthenticated() );

  ngOnInit(): void {
    this.onListenAuthRx();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { userAuthenticated } = state;

      this._userAuthenticated.set( userAuthenticated );
    });
  }

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
  }

}
