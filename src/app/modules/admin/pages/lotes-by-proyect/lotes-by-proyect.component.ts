import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { validate as ISUUID } from 'uuid';
import { Subscription, forkJoin } from 'rxjs';

import { AlertService } from '@shared/services/alert.service';
import { LoteService } from '../../services/lote.service';
import { Coordinate, Lote, Proyect } from '../../interfaces';
import { ProyectService } from '../../services/proyect.service';

import { LotesModule } from './lotes-module.module';
import { MatDialog } from '@angular/material/dialog';
import { LoteModalComponent } from '../../components/lote-modal/lote-modal.component';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { Nomenclature } from '@shared/interfaces';
import { PipesModule } from '@pipes/pipes.module';
import { FormControl, Validators } from '@angular/forms';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { Store } from '@ngrx/store';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiLote } from '@shared/helpers/web-apis.helper';

@Component({
  selector: 'app-lotes-by-proyect',
  standalone: true,
  imports: [
    LotesModule,
    PipesModule
  ],
  templateUrl: './lotes-by-proyect.component.html',
  styles: ``
})
export default class LotesByProyectComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  private _dialog$?: Subscription;

  readonly dialog = inject(MatDialog);

  private readonly _nomenclatureService = inject( NomenclatureService );
  private _alertService = inject( AlertService );
  private _loteService = inject( LoteService );
  private _proyectService = inject( ProyectService );
  private _router = inject( Router );
  private _activatedRoute = inject( ActivatedRoute );

  private _lotes = signal<Lote[]>( [] );
  private _lotesForMap = signal<Lote[]>( [] );
  private _loteToFly = signal<Lote | undefined>( undefined );
  private _centerProyect = signal<number[]>( [] );
  private _polygonCoords = signal<Coordinate[]>( [] );
  private _isBuildLotesInProgress = signal<boolean>( false );

  private _searchInProgress = signal( false );
  private _isSaving = signal( false );
  private _isLoading = signal( false );

  private _allowList = signal( true );
  private _proyect = signal<Proyect | undefined>( undefined );
  private _proyectAndLotes = signal<{ proyect: Proyect, lotes: Lote[] } | undefined>( undefined );
  public isSaving = computed( () => this._isSaving() );
  public searchInProgress = computed( () => this._searchInProgress() );
  public loteToFly = computed( () => this._loteToFly() );

  loteModalTitle = 'Crear nuevo Lote';

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public proyect = computed( () => this._proyect() );
  public proyectAndLotes = computed( () => this._proyectAndLotes() );
  public proyectName = computed( () => this._proyect()?.name ?? '' );
  public lotes = computed( () => this._lotes() );
  public lotesForMap = computed( () => this._lotesForMap() );
  public centerProyect = computed( () => this._centerProyect() );
  public polygonCoords = computed( () => this._polygonCoords() );
  public isBuildLotesInProgress = computed( () => this._isBuildLotesInProgress() );
  public isLoading = computed( () => this._isLoading() );
  public allowList = computed( () => this._allowList() );

  options = {
    autoHide: true,
    scrollbarMinSize: 10
  };

  private _proyectId = '';
  private _loteStatus = signal<Nomenclature[]>( [] );
  public loteStatus = computed( () => this._loteStatus() );
  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {

    this.onListenAuthRx();

    const proyectId = this._activatedRoute.snapshot.params['proyectId'];
    if( !ISUUID( proyectId ) ) {
      this._router.navigateByUrl('404');
      return;
    }

    this._proyectId = proyectId;

    this.onLoadData( proyectId );

  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetLotes() {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiLote && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    this._isLoading.set( true );

    const filter = this.searchInput.value ?? '';

    forkJoin({
      lotesForMap: this._loteService.getLotes( this._proyectId, 1, '', 1000 ),
      lotesForList: this._loteService.getLotes( this._proyectId, 1, filter, 1000 ),
    }).subscribe( ({ lotesForMap, lotesForList }) => {

      this._lotes.set( lotesForList.lotes );
      this._lotesForMap.set( lotesForMap.lotes );

      const proyect = this._proyect()!;
      this._proyectAndLotes.set( { proyect: proyect, lotes: lotesForMap.lotes } )

      this._isLoading.set( false );

    } )
  }

  onSearchLotes() {

    this._searchInProgress.set( true );

    this._isLoading.set( true );

    const filter = this.searchInput.value ?? '';
    this._loteService.getLotes( this._proyectId, 1, filter, 1000 )
    .subscribe( ({ lotes }) => {
      this._lotes.set( lotes );
      this._searchInProgress.set( false );

      this._isLoading.set( false );
    } );
  }

  onLoadData( proyectId: string ) {

    forkJoin({
      proyect: this._proyectService.getProyectById( proyectId ),
      // lotesResponse: this._loteService.getLotes( proyectId, 1, '', 500 ),
      loteStatusResponse: this._nomenclatureService.getLoteStatus()
    }).subscribe( ( { proyect, loteStatusResponse } ) => {

      const { centerCoords, polygonCoords, flatImage } = proyect;
      // const { lotes } = lotesResponse;
      const { nomenclatures } = loteStatusResponse;

      this._proyect.set( proyect );
      this._centerProyect.set( centerCoords );
      this._polygonCoords.set( polygonCoords );
      // this._lotes.set( lotes );
      // this._lotesForMap.set( lotes );
      // this._proyectAndLotes.set( { proyect, lotes } );
      this._loteStatus.set( nomenclatures );

      this.onGetLotes();
    });

  }

  onLoadToUpdate( lote: Lote ) {
    this._loteService.getLoteById( lote.id )
    .subscribe( (lote) => {

      this.openDialog( lote );
    });
  }

  async onRemoveConfirm( lote: Lote ) {

    const responseConfirm = await this._alertService.showConfirmAlert(
      'Verifique que no haya un contrato asociado a este lote',
      `¿Está seguro de eliminar lote "${ lote.code }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._onRemoveLote( lote.id );
    }

  }

  private _onRemoveLote( loteId: string ) {
    this._loteService.removeLote( loteId )
    .subscribe( (loteDeleted) => {
      this._alertService.showAlert(undefined, `Lote eliminado exitosamente`, 'success');

      this.onGetLotes();
    });
  }

  openDialog( loteToUpdate?: Lote ): void {

    const dialogRef = this.dialog.open(LoteModalComponent, {
      width: '750px',
      height: '850px',
      enterAnimationDuration: '0ms',
      exitAnimationDuration: '0ms',
      closeOnNavigation: true,

      data: {
        proyect: this._proyect(),
        loteStatus: this.loteStatus(),
        lotes: this.lotes(),
        webUrlPermissionMethods: this._webUrlPermissionMethods,
        loteToUpdate
      }
    });

    this._dialog$ = dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        this.onGetLotes();
      }

      this._dialog$?.unsubscribe();
    });
  }

  onLoteToFly( lote: Lote ) {
    this._loteToFly.set( lote );
  }

  ngOnDestroy(): void {
    this._dialog$?.unsubscribe();
    this._authrx$?.unsubscribe();
  }

}
