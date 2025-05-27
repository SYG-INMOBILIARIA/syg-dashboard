import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { validate as ISUUID } from 'uuid';

import * as clientProfileactions from '@redux/actions/profile-client.actions';
import { Client, ClientStatus } from '@modules/admin/interfaces';
import { ClientService } from '@modules/admin/services/client.service';
import { AppState } from '@app/app.config';

@Component({
  templateUrl: './profile-client-layout.component.html',
  styles: ``
})
export class ProfileClientLayoutComponent implements OnInit, OnDestroy {

  private _clientProfileId = '';

  private _router = inject( Router );
  private _clientService = inject( ClientService );
  private _store = inject( Store<AppState> );

  public readonly FINALIZED = ClientStatus.Finalized;
  public readonly PENDING = ClientStatus.Pending;
  public readonly NOT_FINALIZED = ClientStatus.NotFinalized;

  private _client = signal<Client | null>( null );
  private _isLoading = signal<boolean>( false );

  public client = computed( () => this._client() );
  public isLoading = computed( () => this._isLoading() );

  ngOnInit(): void {

    this._clientProfileId = localStorage.getItem('clientProfileId') ?? '';

    if( !ISUUID( this._clientProfileId ) ) {
      this._router.navigateByUrl('/dashboard');
      return;
    }

    this.onGetClientProfile();

  }

  onGetClientProfile() {

    this._isLoading.set( true );

    this._store.dispatch( clientProfileactions.onLoadClientProfileInProgress() );

    this._clientService.getClientById( this._clientProfileId )
    .subscribe( (client) => {

      this._client.set( client );
      this._store.dispatch( clientProfileactions.onLoadClientProfile( { client } ) );
      this._isLoading.set( false );
    });
  }

  ngOnDestroy(): void {
    this._store.dispatch( clientProfileactions.onResetClientProfile() );
  }

}
