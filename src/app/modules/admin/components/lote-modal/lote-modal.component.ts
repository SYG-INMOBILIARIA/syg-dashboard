import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { LngLatLike, Map, Marker, Popup } from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

import { v4 as uuid, validate as ISUUID } from 'uuid';
import * as turf from '@turf/turf';
import { Coordinate, Lote, LoteBody, LoteDialogPayload } from '../../interfaces';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { alphaNumericPatt, decimalPatt, fullTextPatt, numberPatt } from '@shared/helpers/regex.helper';
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
import { NgxPaginationModule } from "ngx-pagination";

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
    MatDialogContent,
    InputErrorsDirective,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    NgSelectModule,
    NgxPaginationModule
],
  templateUrl: './lote-modal.component.html',
  styles: `
    #containerLoteModalMap {
      width: 100%;
      height: 75vh;
      margin: 0px;
      background-color: blueviolet;
    }

    .mat-mdc-dialog-content {
      max-height: 100vh;
      overflow: hidden;
    }
  `
})
export class LoteModalComponent implements OnInit, AfterViewInit, OnDestroy {

  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('containerLoteModalMap') mapContainer?: ElementRef<HTMLDivElement>;

  private _map?: Map;
  private _draw?: MapboxDraw;

  //#FIXME: nueva lógica para mostrar lotes
  private _popup: Popup = new Popup({ closeButton: false, closeOnClick: false });
  private hoveredId: string | number | null = null;
  private selectedId: string | number | null = null;

  private readonly SOURCE_ID = 'lotesSource';
  private readonly FILL_ID   = 'lotes-fill';
  private readonly DASHED_LINE_ID   = 'lotes-dashed-line';
  private readonly FLAT_SOURCE_ID   = 'lotes-flat-image-source';
  private readonly FLAT_LAYER_ID   = 'lotes-flat-image-layer';
  private readonly FLAT_BORDER_SOURCE_ID   = 'lotes-flat-border';

  private readonly _emptyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAc/INeUAAAAASUVORK5CYII=';

  //#FIXME: nueva lógica para mostrar lotes

  private readonly _loteService = inject( LoteService );
  private readonly _alertService = inject( AlertService );
  readonly dialogRef = inject(MatDialogRef<LoteModalComponent>);
  readonly data = inject<LoteDialogPayload>(MAT_DIALOG_DATA);

  private _lotesCreatedOrUpdated: Lote[] = [];

  private _formBuilder = inject( UntypedFormBuilder );

  public loteForm = this._formBuilder.group({
      id:            [ '', [] ],
      mz:            [ '', [ Validators.required, Validators.maxLength(3), Validators.pattern( alphaNumericPatt ) ] ],
      block:         [ '', [ Validators.maxLength(3), Validators.pattern( alphaNumericPatt ) ] ],
      ubication:     [ '', [ Validators.pattern( fullTextPatt ) ] ],
      squareMeters:  [  0, [ Validators.required, Validators.min( 60 ), Validators.max( 5000 ) ] ],
      price:         [ null, [ Validators.required, Validators.min( 2000 ), Validators.pattern( decimalPatt ) ] ],
      // loteStatus:    [ null, [ Validators.required ] ],
      numberLote:   [ '', [ Validators.required, Validators.pattern( numberPatt) ], Validators.maxLength( 3 ) ],
      centerCoords:  [ [], [] ],
      polygonCoords: [ [], [] ],
      proyectId:     [ null, [] ],
      stage:         [ null, [ Validators.required ] ],

      pitchMap:      [ 0, [] ],
      bearingMap:    [ 0, [] ],
      zoomMap:       [ 14, [] ],
  });

  private _loteCreated: Lote | undefined = undefined;
  private _isSaving = signal( false );
  public isSaving = computed( () => this._isSaving() );
  private get _loteBody(): LoteBody { return this.loteForm.value as LoteBody; }

  private readonly _stages = [
    { value: 'I', label: 'I' },
    { value: 'II', label: 'II' },
    { value: 'III', label: 'III' },
    { value: 'IV', label: 'IV' },
    { value: 'V', label: 'V' }
  ];

  private _isBuildingMap = signal<boolean>( false );

  public isBuildingMap = computed( () => this._isBuildingMap() );

  loteTitleModal = 'Crear nuevo lote';

  public stages = computed( () => this._stages );

  get isFormInvalid() { return this.loteForm.invalid; }

  inputErrors( field: string ) {
    return this.loteForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.loteForm.errors; }

  isTouched( field: string ) {
    return this.loteForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {

      const { proyect, loteToUpdate, webUrlPermissionMethods } = this.data;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
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

    const { proyect, loteToUpdate } = this.data;
    const { centerCoords, polygonCoords, flatImage } = proyect;

    this._map.on('load', () => {

      // this._map!.setCenter( centerCoords );
      // this._map!.setZoom( 17 );

      this._onAddMapxboxElements();
      this._onAddMapboxEvents();

      if( loteToUpdate ) {

        const { centerCoords, bearingMap, zoomMap, pitchMap  } = loteToUpdate;
        this._map!.setCenter( centerCoords );
        this._map!.setZoom( zoomMap );
        this._map!.setBearing( bearingMap );
        this._map!.setPitch( pitchMap );

      }

      if( flatImage ) {
        this._buildFlatProyect( flatImage, polygonCoords );
      } else {
        this._onBuildBorderPolygon( polygonCoords );
      }

    });


  }

  private _onAddMapxboxElements() {

    if( !this._map ) throw new Error(`Map not found!!!`);

    //TODO: Elementos para plano de mapa
    // Coordenadas dummy o iniciales
    const initialCoords: [[number, number], [number, number], [number, number], [number, number]] = [
      [-76.95, -12.10], // top-left
      [-76.94, -12.10], // top-right
      [-76.94, -12.11], // bottom-right
      [-76.95, -12.11]  // bottom-left
    ];

    this._map.addSource( this.FLAT_SOURCE_ID, {
      type: 'image',
      url: this._emptyImage,
      coordinates: initialCoords
    });

    this._map.addLayer({
      id: this.FLAT_LAYER_ID,
      type: 'raster',
      source: this.FLAT_SOURCE_ID,
    });
    //TODO: Elementos para plano

    //TODO: Elementos para borde de plano
    // source vacío al inicio; borramos si no hay plano
    this._map.addSource(this.FLAT_BORDER_SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id-2',
    });

     // add a line layer to visualize the clipping region.
     this._map.addLayer({
      'id': 'dashed-line',
      'type': 'line',
      'source': this.FLAT_BORDER_SOURCE_ID,
      'paint': {
          'line-color': 'rgba(255, 0, 0, 0.9)',
          'line-dasharray': [0, 4, 3],
          'line-width': 5
      }
    });

    //TODO: Elementos para borde de plano

    // source vacío al inicio; promoteId para feature-state
    this._map.addSource(this.SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id',
    });

    // fill con estilo por estado
    this._map.addLayer({
      id: this.FILL_ID, type: 'fill', source: this.SOURCE_ID,
      paint: {
        'fill-color': '#67e8f9',
        'fill-opacity': [
          'case',
            ['boolean', ['feature-state', 'selected'], false], 0.55,
            ['boolean', ['feature-state', 'hovered'],  false], 0.45,
            0.3
        ],
      }
    });

    this._map.addLayer({
      id: this.DASHED_LINE_ID, type: 'line', source: this.SOURCE_ID,
      paint: { 'line-color': '#1f2937', 'line-width': 0.5 }
    });

  }

  private _onAddMapboxEvents() {

    if( !this._map ) throw new Error(`Map not found!!!`);

    this._map.on( 'moveend', (event) => {

      const pitch = this._map!.getPitch();
      const bearing = this._map!.getBearing();
      const zoom = this._map!.getZoom();
      const centerCoords = this._map!.getCenter().toArray();

      this.loteForm.get('centerCoords')?.setValue( centerCoords );
      this.loteForm.get('pitchMap')?.setValue( pitch );
      this.loteForm.get('bearingMap')?.setValue( bearing );
      this.loteForm.get('zoomMap')?.setValue( zoom );
    });

  }

  private _onBuildBorderPolygon( polygonCoords: Coordinate[] ) {

    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const { lotes } = this.data;

    const points = polygonCoords.reduce<number[][]>( (acc: number[][], current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const features = [
      {
          'type': 'Feature',
          'properties': {},
          'geometry': {
              'coordinates': [ points ],
              'type': 'Polygon'
          }
      }
    ];

    const fc = { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
    (this._map!.getSource(this.FLAT_BORDER_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(fc);

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

    // const imgSourceId = uuid();

    // // Add an image source
    // this._map.addSource(imgSourceId, {
    //   'type': 'image',
    //   'url': urlImg,
    //   'coordinates': points
    // });

    // // Add a layer for displaying the image
    // this._map.addLayer({
    //   'id': uuid(),
    //   'type': 'raster',
    //   'source': imgSourceId,
    //   'paint': { 'raster-opacity': 1.0 }
    // });

    (this._map.getSource( this.FLAT_SOURCE_ID) as mapboxgl.ImageSource).updateImage({
      url: urlImg,
      coordinates: points
    });

    this.onAllowDrawer();
    this.onBuildLotes( lotes );

    setTimeout(() => {
      this._isBuildingMap.set( false );
    }, 1200);


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
        styles: [
          // Línea discontinua mientras se dibuja
          {
            id: 'gl-draw-line',
            type: 'line',
            filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
            paint: {
              'line-color': '#007cbf',
              'line-width': 2,
              'line-dasharray': [4, 2] // Línea discontinua azul
            }
          },
          // Borde del polígono mientras se dibuja
          {
            id: 'gl-draw-polygon-stroke-active',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            paint: {
              'line-color': '#007cbf',
              'line-width': 2,
              'line-dasharray': [4, 2]
            }
          },
          // Relleno mientras se dibuja
          {
            id: 'gl-draw-polygon-fill-active',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
            paint: {
              'fill-color': '#007cbf',
              'fill-opacity': 0.1
            }
          },
          // Puntos de vértice
          {
            id: 'gl-draw-points',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['!=', 'meta', 'midpoint']],
            paint: {
              'circle-radius': 5,
              'circle-color': '#007cbf'
            }
          },
          // Midpoints (puntos intermedios entre vértices)
          {
            id: 'gl-draw-midpoints',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
            paint: {
              'circle-radius': 3.5,
              'circle-color': '#27BBF5'
            }
          }
        ]
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

    this._map.on('draw.create', ( e ) => this.updateArea( e, 'create' ));
    this._map.on('draw.delete', ( e ) => this.updateArea( e, 'delete' ));
    this._map.on('draw.update', ( e ) => this.updateArea( e, 'update' ));

  }

  updateArea( e: any, action: 'create' | 'delete' | 'update' ) {

    if( !this._draw ) throw new Error('Draw no loaded!!');

    const data = this._draw.getAll();

    // console.log({data, coordinates});

    const polygon = e.features[0];

    if( ['create', 'update'].includes( action ) ) {

      const kinks = turf.kinks(polygon);

      console.log({kinks});

      if (kinks.features.length > 0) {
        alert('❌ El polígono tiene autointersecciones.');

        // Opcional: eliminarlo automáticamente
        this._draw?.deleteAll();
      } else {

        const coordinates = (data.features[0].geometry as any).coordinates as number[][][];
        const polygonCoords = coordinates[0].map( (coord) => {
          return {
            id: null,
            lng: coord[0],
            lat: coord[1],
          };
        });

        this.loteForm.get('polygonCoords')?.setValue( polygonCoords );

        console.log('✅ Polígono válido');
      }
    }


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

    // for ( const key in lotes ) {
    //   if (Object.prototype.hasOwnProperty.call(lotes, key)) {

    //     const lote = lotes[key];
    //     this._onBuilLotePolygon( lote );

    //   }
    // }

    const features = lotes.map( (lote) => ({
      type: 'Feature',
      id: lote.id, // <- clave para feature-state
      properties: {
        id: lote.id,
        code: lote.code,
        price: lote.price,
        squareMeters: lote.squareMeters,
        status: lote.loteStatus, // 'Available' | 'Selled' | 'InProgress'
        center: lote.centerCoords,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ lote.polygonCoords.map(p => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]) ],
        // coordinates: points,
      }
    }));

    const fc = { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
    (this._map.getSource(this.SOURCE_ID) as mapboxgl.GeoJSONSource).setData(fc);

  }

  private _onBuilLotePolygon( lote: Lote ) {

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
    const { proyect } = this.data;
    this._isSaving.set( false );
    this.loteForm.reset({
      proyectId: proyect.id
    });

  }

  onClose() {
    this.dialogRef.close({
      lotes: this._lotesCreatedOrUpdated,
      action: 'created'
    });
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
      .subscribe( {
        next: (loteCreated) => {

          this._alertService.showAlert(`Lote #${ loteCreated.code }, creado exitosamente`, undefined, 'success');
          this.onResetAfterSubmit();

          const { lotes } = this.data;

          const newLotes = [...lotes, loteCreated];

          this.onBuildLotes( newLotes );
          // this._onBuilLotePolygon( loteCreated );

          this._lotesCreatedOrUpdated.push( loteCreated );
          //this.dialogRef.close( loteCreated );
          this._draw?.deleteAll()


        },
        complete: () => {
          this._isSaving.set( false );
        }
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

        this._lotesCreatedOrUpdated.push( loteUpdate );
        this._draw?.deleteAll()
        this.dialogRef.close({
          lotes: this._lotesCreatedOrUpdated,
          action: 'updated'
        });

      });

  }

  ngOnDestroy(): void {
    this._map?.remove();
  }

}
