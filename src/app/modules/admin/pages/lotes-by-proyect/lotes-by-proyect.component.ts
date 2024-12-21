import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { validate as ISUUID } from 'uuid';
import { Subscription, forkJoin } from 'rxjs';

import { AlertService } from '@shared/services/alert.service';
import { LoteService } from '../../services/lote.service';
import { Coordinate, Lote, ProyectById } from '../../interfaces';
import { ProyectService } from '../../services/proyect.service';

import { LotesModule } from './lotes-module.module';
import { MatDialog } from '@angular/material/dialog';
import { LoteModalComponent } from '../../components/lote-modal/lote-modal.component';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { Nomenclature } from '@shared/interfaces';
import { PipesModule } from '@pipes/pipes.module';

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

  private _dialog$?: Subscription;

  readonly dialog = inject(MatDialog);

  private readonly _nomenclatureService = inject( NomenclatureService );
  private _alertService = inject( AlertService );
  private _loteService = inject( LoteService );
  private _proyectService = inject( ProyectService );
  private _router = inject( Router );
  private _activatedRoute = inject( ActivatedRoute );

  private _lotes = signal<Lote[]>( [] );
  private _centerProyect = signal<number[]>( [] );
  private _polygonCoords = signal<Coordinate[]>( [] );
  private _isBuildLotesInProgress = signal<boolean>( false );

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _proyect = signal<ProyectById | undefined>( undefined );
  public isSaving = computed( () => this._isSaving() );

  loteModalTitle = 'Crear nuevo Lote';

  public lotes = computed( () => this._lotes() );
  public centerProyect = computed( () => this._centerProyect() );
  public polygonCoords = computed( () => this._polygonCoords() );
  public isBuildLotesInProgress = computed( () => this._isBuildLotesInProgress() );

  options = {
    autoHide: true,
    scrollbarMinSize: 10
  };

  private _proyectId = '';
  private _loteStatus = signal<Nomenclature[]>( [] );
  public loteStatus = computed( () => this._loteStatus() );

  ngOnInit(): void {

    const proyectId = this._activatedRoute.snapshot.params['proyectId'];
    if( !ISUUID( proyectId ) ) {
      this._router.navigateByUrl('404');
      return;
    }

    this._proyectId = proyectId;

    this.onLoadData( proyectId );

  }

  onGetLotes() {
    this._loteService.getLotes( this._proyectId, 1, '', 500 )
    .subscribe( ({ lotes, total }) => {
      this._lotes.set( lotes );
    });
  }

  onLoadData( proyectId: string ) {

    forkJoin({
      proyect: this._proyectService.getProyectById( proyectId ),
      lotesResponse: this._loteService.getLotes( proyectId, 1, '', 500 ),
      loteStatusResponse: this._nomenclatureService.getLoteStatus()
    }).subscribe( ( { proyect, lotesResponse, loteStatusResponse } ) => {

      const { centerCoords, polygonCoords, flatImage } = proyect;
      const { lotes } = lotesResponse;
      const { nomenclatures } = loteStatusResponse;

      this._proyect.set( proyect );
      this._centerProyect.set( centerCoords );
      this._polygonCoords.set( polygonCoords );
      this._lotes.set( lotes );
      this._loteStatus.set( nomenclatures );
    });

  }

  openDialog(): void {

    const dialogRef = this.dialog.open(LoteModalComponent, {
      width: '700px',
      height: '760px',
      enterAnimationDuration: '0ms',
      exitAnimationDuration: '0ms',
      closeOnNavigation: true,
      data: {
        proyect: this._proyect(),
        loteStatus: this.loteStatus(),
        lotes: this.lotes()
      }
    });

    this._dialog$ = dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result !== undefined) {
        this.onGetLotes();
      }

      this._dialog$?.unsubscribe();
    });
  }

  ngOnDestroy(): void {
    this._dialog$?.unsubscribe();
  }

}
