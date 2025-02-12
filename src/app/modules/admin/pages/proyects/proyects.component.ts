import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { MiniMapComponent } from '@shared/components/mini-map/mini-map.component';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { ProyectService } from '../../services/proyect.service';
import { Proyect } from '../../interfaces';
import { AppState } from '../../../../app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiProyect } from '@shared/helpers/web-apis.helper';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MiniMapComponent,
    RouterModule
  ],
  templateUrl: './proyects.component.html',
  styles: ``
})
export default class ProyectsComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  private _proyectService = inject( ProyectService );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _filter = '';

  private _isLoading = signal( true );
  private _totalProyects = signal<number>( 0 );
  private _proyects = signal<Proyect[]>( [] );
  private _allowList = signal( true );

  public proyects = computed( () => this._proyects() );
  public totalProyects = computed( () => this._totalProyects() );
  public allowList = computed( () => this._allowList() );

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {
    this.onListenAuthRx();
    this.onGetProyects();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onSearch() {
    this._filter = this.searchInput.value ?? '';
    // this.onGetClients( 1 );
  }

  onGetProyects( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiProyect && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    this._proyectService.getProyects( page, this._filter )
    .subscribe( ( { proyects, total }) => {

      this._proyects.set( proyects );
      this._totalProyects.set( total );

      setTimeout(() => {
        initFlowbite();
      }, 400);

    } )
  }

  ngOnDestroy(): void {
      this._authrx$?.unsubscribe();
  }

}
