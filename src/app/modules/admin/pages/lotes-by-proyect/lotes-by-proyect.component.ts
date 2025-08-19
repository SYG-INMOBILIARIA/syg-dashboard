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
import { FormControl, UntypedFormBuilder, Validators } from '@angular/forms';
import { fullTextNumberPatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { Store } from '@ngrx/store';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiLote } from '@shared/helpers/web-apis.helper';
import { LoteDialogResponse, LoteFilterBody } from './interfaces';
import { PaginationComponent } from "@shared/components/pagination/pagination.component";

@Component({
  selector: 'app-lotes-by-proyect',
  standalone: true,
  imports: [
    LotesModule,
    PipesModule,
    PaginationComponent
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
  private _totalLotes = signal<number>( 0 );
  private _loteToFly = signal<Lote | undefined>( undefined );
  private _loteToDeleted = signal<Lote | undefined>( undefined );
  private _loteToCreated = signal<Lote | undefined>( undefined );
  private _centerProyect = signal<number[]>( [] );
  private _polygonCoords = signal<Coordinate[]>( [] );

  private _searchInProgress = signal( false );
  private _isSaving = signal( false );
  private _listLotesInProgress = signal( false );

  private _allowList = signal( true );
  private _proyect = signal<Proyect | undefined>( undefined );
  private _proyectAndLotes = signal<{ proyect: Proyect, lotes: Lote[] } | undefined>( undefined );
  public isSaving = computed( () => this._isSaving() );
  public searchInProgress = computed( () => this._searchInProgress() );
  public loteToFly = computed( () => this._loteToFly() );
  public loteToDeleted = computed( () => this._loteToDeleted() );
  public loteToCreated = computed( () => this._loteToCreated() );

  loteModalTitle = 'Crear nuevo Lote';

  private readonly _formBuilder = inject( UntypedFormBuilder );

  public loteFilterForm = this._formBuilder.group({
    code: ['', [ Validators.pattern( fullTextNumberPatt ) ]],
    mz:   ['', [ Validators.pattern( fullTextNumberPatt ) ]],
  });

  public proyect = computed( () => this._proyect() );
  public proyectAndLotes = computed( () => this._proyectAndLotes() );
  public proyectName = computed( () => this._proyect()?.name ?? '' );
  public lotes = computed( () => this._lotes() );
  public totalLotes = computed( () => this._totalLotes() );
  public lotesForMap = computed( () => this._lotesForMap() );
  public centerProyect = computed( () => this._centerProyect() );
  public polygonCoords = computed( () => this._polygonCoords() );
  public listLotesInProgress = computed( () => this._listLotesInProgress() );
  public allowList = computed( () => this._allowList() );

  options = {
    autoHide: true,
    scrollbarMinSize: 10
  };

  private _proyectId = '';
  private _loteStatus = signal<Nomenclature[]>( [] );
  public loteStatus = computed( () => this._loteStatus() );

  private get _loteFilterBody(): LoteFilterBody { return this.loteFilterForm.value as LoteFilterBody; }

  get isFormInvalid() { return this.loteFilterForm.invalid; }

  inputErrors( field: string ) {
    return this.loteFilterForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.loteFilterForm.errors; }

  isTouched( field: string ) {
    return this.loteFilterForm.get(field)?.touched ?? false;
  }

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

  private _onValidateGetAllow() {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiLote && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

  }

  onGetLotesForMap() {

    this._onValidateGetAllow();

    this._loteService.getLotes( this._proyectId, 1, '', 1000 )
    .subscribe( ({ lotes }) => {

      this._lotesForMap.set( lotes );

      const proyect = this._proyect()!;
      this._proyectAndLotes.set( { proyect, lotes } )
      this._listLotesInProgress.set( false );

    })
  }

  onGetLotesForList( page = 1 ) {

    this._onValidateGetAllow();

    this._searchInProgress.set( true );

    const { code, mz } = this._loteFilterBody;
    const filter = `code-${code};mz-${mz}`;

    this._loteService.getLotes( this._proyectId, page, filter, 20 )
    .subscribe( ({ lotes, total }) => {
      this._lotes.set( lotes );
      this._totalLotes.set( total );
      this._searchInProgress.set( false );
    } );
  }

  onLoadData( proyectId: string ) {

    this._listLotesInProgress.set( true );

    forkJoin({
      proyect: this._proyectService.getProyectById( proyectId ),
      loteStatusResponse: this._nomenclatureService.getLoteStatus()
    }).subscribe( ( { proyect, loteStatusResponse } ) => {

      const { centerCoords, polygonCoords, flatImage } = proyect;
      const { nomenclatures } = loteStatusResponse;

      this._proyect.set( proyect );
      this._centerProyect.set( centerCoords );
      this._polygonCoords.set( polygonCoords );
      this._loteStatus.set( nomenclatures );

      this.onGetLotesForMap();
      this.onGetLotesForList();

    });

  }

  onLoadToUpdate( lote: Lote ) {

    this._alertService.showLoading();

    this._loteService.getLoteById( lote.id )
    .subscribe( (lote) => {

      this._alertService.close();
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

    this._alertService.showLoading();
    this._loteService.removeLote( loteId )
    .subscribe( (loteDeleted) => {
      this._alertService.showAlert( 'OK', `Lote eliminado exitosamente`, 'success');

      this._loteToDeleted.set( loteDeleted );
      this.onGetLotesForList();
    });
  }

  openDialog( loteToUpdate?: Lote ): void {

    const dialogRef = this.dialog.open(LoteModalComponent, {
      width: '60vw',
      height: '100vh',
      maxWidth: '60vw',
      // maxHeight: '100vh',
      enterAnimationDuration: '0ms',
      exitAnimationDuration: '0ms',
      closeOnNavigation: true,

      data: {
        proyect: this._proyect(),
        loteStatus: this.loteStatus(),
        lotes: this.lotesForMap(),
        webUrlPermissionMethods: this._webUrlPermissionMethods,
        loteToUpdate
      }
    });


    this._dialog$ = dialogRef.afterClosed().subscribe( (result: LoteDialogResponse) => {
      if (result !== undefined) {

        if( result.lotes.length > 0 ) {

          if( result.action == 'updated' ) {

            for (const lote of result.lotes) {
              this._loteToDeleted.set( lote );
              this._loteToCreated.set( lote );
            }

          } else {
            for (const lote of result.lotes) {
              this._loteToCreated.set( lote );
            }
          }

        }

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
