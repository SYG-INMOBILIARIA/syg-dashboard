import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { AppState } from '@app/app.config';
import { User } from '@modules/security/interfaces';

@Component({
  selector: 'app-home-profile',
  templateUrl: './home-profile.component.html',
  styles: ``,

})
export class HomeProfileComponent implements OnInit, OnDestroy {

  private _profileRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );

  private _userAuthenticated = signal<User | null>(null);
  public userAuthenticated = computed( () => this._userAuthenticated() );

  ngOnInit(): void {
    this.onListenProfileRx();
  }

  onListenProfileRx() {
    this._profileRx$ = this._store.select('profile')
    .subscribe( (state) => {
      const { userProfile } = state;

      this._userAuthenticated.set( userProfile );
    });
  }

  ngOnDestroy(): void {
    this._profileRx$?.unsubscribe();
  }

}
