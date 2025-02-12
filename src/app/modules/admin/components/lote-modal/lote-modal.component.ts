import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { LngLatLike, Map } from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

import { v4 as uuid, validate as ISUUID } from 'uuid';
import * as turf from '@turf/turf';
import { Coordinate, Lote, LoteBody, LoteDialogPayload } from '../../interfaces';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { alphaNumericPatt, decimalPatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { Nomenclature, Photo } from '@shared/interfaces';
import { NgSelectModule } from '@ng-select/ng-select';
import { LoteService } from '../../services/lote.service';
import { AlertService } from '@shared/services/alert.service';
import { LoteStatus } from '../../enum';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiLote } from '@shared/helpers/web-apis.helper';

interface PolygonCoord {
  lng: number;
  lat: number;
  id: string | null;
}


@Component({
  selector: 'app-lote-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    InputErrorsDirective,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    NgSelectModule
  ],
  templateUrl: './lote-modal.component.html',
  styles: `
    #map {
      width: 100%;
      height: 430px;
      margin: 0px;
      background-color: blueviolet;
    }

    .mat-mdc-dialog-content {
      overflow: hidden;
    }
  `
})
export class LoteModalComponent implements OnInit, AfterViewInit, OnDestroy {

  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;

  private _map?: Map;
  private _draw?: MapboxDraw;

  private readonly _loteService = inject( LoteService );
  private readonly _alertService = inject( AlertService );
  readonly dialogRef = inject(MatDialogRef<LoteModalComponent>);
  readonly data = inject<LoteDialogPayload>(MAT_DIALOG_DATA);

  private _formBuilder = inject( UntypedFormBuilder );

  public loteForm = this._formBuilder.group({
      id:            [ '', [] ],
      mz:            [ '', [ Validators.required, Validators.maxLength(3), Validators.pattern( alphaNumericPatt ) ] ],
      block:         [ '', [ Validators.required, Validators.maxLength(3), Validators.pattern( alphaNumericPatt ) ] ],
      ubication:     [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
      squareMeters:  [  0, [ Validators.required, Validators.min( 60 ), Validators.max( 5000 ) ] ],
      price:         [ null, [ Validators.required, Validators.min( 5000 ), Validators.pattern( decimalPatt ) ] ],
      loteStatus:    [ null, [ Validators.required ] ],
      centerCoords:  [ [], [] ],
      polygonCoords: [ [], [] ],
      proyectId:     [null, [] ]
  });

  private _isSaving = signal( false );
  public isSaving = computed( () => this._isSaving() );
  private get _loteBody(): LoteBody { return this.loteForm.value as LoteBody; }

  private _loteStatus = signal<Nomenclature[]>( [] );
  public loteStatus = computed( () => this._loteStatus() );

  private _isBuildingMap = signal<boolean>( false );

  public isBuildingMap = computed( () => this._isBuildingMap() );

  loteTitleModal = 'Crear nuevo lote';

  get isFormInvalid() { return this.loteForm.invalid; }

  inputErrors( field: string ) {
    return this.loteForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.loteForm.errors; }

  isTouched( field: string ) {
    return this.loteForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {

    const { loteStatus, proyect, loteToUpdate, webUrlPermissionMethods } = this.data;

    this._webUrlPermissionMethods = webUrlPermissionMethods;
    this._loteStatus.set( loteStatus );
    this.loteForm.get('proyectId')?.setValue( proyect.id );

    if( loteToUpdate ) {
      const { polygonCoords, ...lote } = loteToUpdate;
      this.loteTitleModal = `Actualizar lote ${ lote.code }`;

      this.loteForm.reset( lote );
    }

  }

  ngAfterViewInit(): void {

    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._isBuildingMap.set( true );

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: [ -80.6987307175805,-4.926770405375706 ], // starting position [lng, lat]
      zoom: 14, //
    });

    const { proyect } = this.data;

    this._map.on('load', () => {

      const { centerCoords, polygonCoords, flatImage } = proyect;
      this._map!.setCenter( centerCoords );
      this._map!.setZoom( 17 );

      if( flatImage ) {
        this._buildFlatProyect( flatImage, polygonCoords );
      } else {
        this._onBuildBorderPolygon( polygonCoords );
      }

    });

    this._map.on( 'moveend', (event) => {
      this.loteForm.get('centerCoords')?.setValue( this._map?.getCenter().toArray() );
    });

  }

  private _onBuildBorderPolygon( polygonCoords: Coordinate[] ) {

    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const { lotes } = this.data;

    const points = polygonCoords.reduce<number[][]>( (acc: number[][], current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    this._map.addSource('eraser', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': { 'coordinates': [ points ], 'type': 'Polygon' }
                }
            ]
        }
    });

    // add a line layer to visualize the clipping region.
    this._map.addLayer({
        'id': 'eraser-debug',
        'type': 'line',
        'source': 'eraser',
        'paint': {
            'line-color': 'rgba(255, 0, 0, 0.9)',
            'line-dasharray': [0, 4, 3],
            'line-width': 5
        }
    });

    this.onAllowDrawer();
    this.onBuildLotes( lotes );

    setTimeout(() => {
      this._isBuildingMap.set( false );
    }, 400);

  }

  private async _buildFlatProyect( flatImage: Photo, polygonCoords: Coordinate[] ) {

    if( !this._map ) throw new Error(`Div map container not found!!!`);
    const { urlImg } = flatImage;

    const { lotes } = this.data;

    const points = polygonCoords.reduce<any>( (acc: number[][], current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const imgSourceId = uuid();

    // Add an image source
    this._map.addSource(imgSourceId, {
      'type': 'image',
      'url': urlImg,
      'coordinates': points
    });

    // Add a layer for displaying the image
    this._map.addLayer({
      'id': uuid(),
      'type': 'raster',
      'source': imgSourceId,
      'paint': { 'raster-opacity': 1.0 }
    });

    this.onAllowDrawer();
    this.onBuildLotes( lotes );

    setTimeout(() => {
      this._isBuildingMap.set( false );
    }, 1200);

    // const polygonId = uuid();

    // this._map?.addSource( polygonId, {
    //   'type': 'geojson',
    //   'data': {
    //       'type': 'Feature',
    //       'properties': {},
    //       'geometry': { 'type': 'Polygon', 'coordinates': [ points ] }
    //   }
    // });

    // this._alertService.showLoading();

    // this._map?.loadImage( urlImg, (err, image) => {
    //   if (err) throw err;

    //   const imageId = uuid();
    //   // Add the image to the map style.
    //   this._map!.addImage(imageId, image!, {
    //     pixelRatio: 3
    //   });

    //   // Create a new layer and style it using `fill-pattern`.
    //   this._map!.addLayer({
    //     'id': uuid(),
    //     'type': 'fill',
    //     'source': polygonId,
    //     'paint': { 'fill-pattern': imageId }
    //   });

    //   this._alertService.close();
    //   this.onAllowDrawer();
    //   this.onBuildLotes( lotes );
    // });

  }

  onAllowDrawer() {

    if( !this._map ) throw new Error(`Div map container not found!!!`);


    this._draw = new MapboxDraw({
        displayControlsDefault: false,
        // Select which mapbox-gl-draw control buttons to add to the map.
        controls: {
            polygon: true,
            trash: true,
        },
        // Set mapbox-gl-draw to draw by default.
        // The user does not have to click the polygon control button first.
        defaultMode: 'draw_polygon',
    });

    this._map.addControl( this._draw );

    const { loteToUpdate } = this.data;

    if( loteToUpdate ) {

      const { polygonCoords, centerCoords } = loteToUpdate;

      this._map.setCenter( centerCoords );
      this._map.setZoom( 19.2 );

      const coordinates = polygonCoords.reduce<number[][]>( (acc, current) => {
        acc.push([ current.lng, current.lat ]);
        return acc;
      }, []);

      const originPolygonCoords = polygonCoords.map( (current) => {
        return {
          id: null,
          lng: current.lng,
          lat: current.lat,
        };
      });

      this.loteForm.get('polygonCoords')?.setValue( originPolygonCoords );

      this._draw!.add({
        type: 'Polygon',
        coordinates: [ coordinates ],
      });

    }

    this._map.on('draw.create', ( e ) => this.updateArea( e ));
    this._map.on('draw.delete', ( e ) => this.updateArea( e ));
    this._map.on('draw.update', ( e ) => this.updateArea( e ));

  }

  updateArea(e: any) {

    if( !this._draw ) throw new Error('Draw no loaded!!');

    const data = this._draw.getAll();
    const coordinates = (data.features[0].geometry as any).coordinates as number[][][];

    // console.log({data, coordinates});

    const polygonCoords = coordinates[0].map( (coord) => {
      return {
        id: null,
        lng: coord[0],
        lat: coord[1],
      };
    });

    this.loteForm.get('polygonCoords')?.setValue( polygonCoords );

    // const answer = document.getElementById('calculated-area');
    if (data.features.length > 0) {
        const area = turf.area(data);
        // Restrict the area to 2 decimal points.
        const rounded_area = Math.round(area * 100) / 100;

        // console.log({area: rounded_area});
        this.loteForm.get('squareMeters')?.setValue( rounded_area );
        // answer!.innerHTML = `<p><strong>${rounded_area}</strong></p><p>square meters</p>`;
    } else {
        // answer!.innerHTML = '';
        if (e.type !== 'draw.delete')
            alert('Click the map to draw a polygon.');
    }
  }

  onBuildLotes( lotes: Lote[] ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const { loteToUpdate } = this.data;
    if( loteToUpdate ) {
      lotes = lotes.filter( (lote) => lote.id != loteToUpdate.id );
    }

    for ( const key in lotes ) {
      if (Object.prototype.hasOwnProperty.call(lotes, key)) {

        const lote = lotes[key];
        this._onBuilLoteDPolygon( lote );

      }
    }

  }

  private _onBuilLoteDPolygon( lote: Lote ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const points = lote.polygonCoords.reduce<[number, number][]>( (acc, current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const sourceId = lote.id;

    this._map.addSource( sourceId, {
      'type': 'geojson',
      'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
              'type': 'Polygon',
              'coordinates': [ points ]
          }
      }
    });

    let fillColor = '#2d91ff';

    switch ( lote.loteStatus ) {
      case LoteStatus.Available:
          fillColor = '#67e8f9';
        break;

        case LoteStatus.Selled:
          fillColor = '#31c48d';
          break;

          case LoteStatus.InProgress:
            fillColor = '#6b7280';
            break;

      default:
        fillColor = '#fce96a';
        break;
    }

    this._map.addLayer({
      'id': uuid(),
      'type': 'fill',
      'source': sourceId,
      'paint': {
        'fill-color': fillColor,
        'fill-opacity': 0.3
      },
    });

    // add a line layer to visualize the clipping region.
    this._map.addLayer({
        'id': uuid(),
        'type': 'line',
        'source': sourceId,
        'paint': {
            'line-color': '#000',
            'line-dasharray': [0, 4, 3],
            'line-width': 0.7
        }
    });

  }

  onResetAfterSubmit() {
    this._isSaving.set( false );
    this.loteForm.reset();
  }

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) {
      this.loteForm.markAllAsTouched();
      return;
    }

    const { id, ...body } = this._loteBody;

    if( !id || !ISUUID( id ) ) {

      const allowCreate = this._webUrlPermissionMethods.some(
        (permission) => permission.webApi == apiLote && permission.methods.includes( 'POST' )
      );

      if( !allowCreate ) {
        this._alertService.showAlert( undefined, 'No tiene permiso para crear un lote', 'warning');
        return;
      }

      this._isSaving.set( true );

      this._loteService.createLote( body )
      .subscribe( (loteCreated) => {

        this._alertService.showAlert(`Lote #${ loteCreated.code }, creado exitosamente`, undefined, 'success');
        this.onResetAfterSubmit();
        this.dialogRef.close( loteCreated );

      });
      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiLote && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un lote', 'warning');
      return;
    }

    this._isSaving.set( true );

    this._loteService.updateLote( id, body )
      .subscribe( (loteUpdate) => {

        this._alertService.showAlert(`Lote #${ loteUpdate.code }, actualizado exitosamente`, undefined, 'success');
        this.onResetAfterSubmit();
        this.dialogRef.close( loteUpdate );

      });

  }

  ngOnDestroy(): void {
    this._map?.remove();
  }

}
