import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { AuthState } from '@redux/reducers/auth.reducer';
import { AppState } from '../../../app.config';
import { Permission } from '../../../auth/interfaces';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'sidenav',
  templateUrl: './sidenav.component.html',
  styles: ``
})
export class SidenavComponent implements OnInit, OnDestroy {

  private _authRx$?: Subscription;

  private _store = inject( Store<AppState> );

  private _appMenu = signal<Permission[]>( [] );
  public appMenu = computed( () => this._appMenu() );

  ngOnInit(): void {
    this.onListenAuthRx();

    setTimeout(() => {
      initFlowbite();
    }, 500);
  }

  onListenAuthRx() {
    this._authRx$ = this._store.select('auth')
    .subscribe( (state: AuthState) => {

      const { menu } = state;

      this._appMenu.set( menu );

    });
  }

  ngOnDestroy(): void {
    this._authRx$?.unsubscribe();
  }

}
