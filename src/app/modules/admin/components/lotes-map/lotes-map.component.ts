import { Component, ElementRef, Input, ViewChild, computed, inject, signal } from '@angular/core';
import { LngLatLike, Map, Popup } from 'mapbox-gl';
import { v4 as uuid } from 'uuid';

import { Coordinate, Lote, Proyect } from '../../interfaces';
import { LoteStatus } from '../../enum';
import { CommonModule, formatNumber } from '@angular/common';
import { Photo } from '@shared/interfaces';
import { AlertService } from '@shared/services/alert.service';

@Component({
  selector: 'lotes-map',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './lotes-map.component.html',
})
export class LotesMapComponent {

  @ViewChild('lotesMap') mapContainer?: ElementRef<HTMLDivElement>;

  private _map?: Map;
  private _popup?: Popup;

  private _alertService = inject( AlertService );
  private _flatImage?: Photo;

  @Input({ required: true }) set proyectAndLotes( value: { proyect: Proyect, lotes: Lote[] } | undefined ) {
    if( value ) {

      const { proyect, lotes } = value;

      const { centerCoords, polygonCoords, flatImage } = proyect;
      this._centerMap = centerCoords;
      this._zoom = 17.8;

      this._map?.setCenter( this._centerMap );
      this._map?.setZoom( this._zoom );
      this._polygonCoords = polygonCoords;
      this._flatImage = flatImage;

      setTimeout(() => {
        this._onUpdateLotesRegistered( lotes );
      }, 400);
    }
  }

  @Input({ required: false }) set flyToLote( lote: Lote | undefined ) {
    if( lote ) {
      this._flyToLote( lote );
    }
  }

  private _lotesRegistered: Lote[] = [];

  private _centerMap: [number, number] = [ -80.6987307175805,-4.926770405375706 ];
  private _zoom = 17;
  private _polygonCoords: Coordinate[] = [];
  private _imageMapId?: string;

  private _isBuildingMap = signal<boolean>( false );

  public isBuildingMap = computed( () => this._isBuildingMap() );

  ngAfterViewInit(): void {

    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._isBuildingMap.set( true );

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: this._centerMap, // starting position [lng, lat]
      zoom: this._zoom,
      // maxZoom: 18,
      // minZoom: 17.0
    });

    this._map.on('load', () => {
      // this._map!.resize();

      if( this._flatImage ) {
        this._buildFlatProyect( this._flatImage );

      } else {
        this._onBuildBorderPolygon( this._polygonCoords );
      }

    });

    this._map.on('moveend', () => {
      this._centerMap = this._map?.getCenter().toArray() ?? [ -80.6987307175805,-4.926770405375706 ];
      this._zoom = this._map?.getZoom() ?? this._zoom;
    });

  }

  onBuildPolygonByLotesRegistered() {

    this._lotesRegistered.forEach( (lote) => {
      this._onBuildLotePolygon( lote );
    });

  }

  private _onUpdateLotesRegistered( lotes: Lote[] ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    if( this._lotesRegistered.length > 0 ) {

      this._map?.remove();
      this._lotesRegistered = lotes;
      this.ngAfterViewInit();

    } else {

      this._lotesRegistered = lotes;

      if( this._flatImage ) {
        this._buildFlatProyect( this._flatImage );
      } else {
        this._onBuildBorderPolygon( this._polygonCoords );
      }

    }

  }

  private _onBuildBorderPolygon( polygonCoords: Coordinate[] ) {
    if( !polygonCoords ) throw new Error(`PolygonCoords undefined!!!`);
    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const points = polygonCoords.reduce<number[][]>( (acc: number[][], current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const eraserId = uuid();

    this._map.addSource( eraserId, {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                        'coordinates': [ points ],
                        'type': 'Polygon'
                    }
                }
            ]
        }
    });

    // add the clip layer and configure it to also remove symbols and trees.
    // clipping becomes active from zoom level 16 and below.
    this._map.addLayer({
        'id': uuid(),
        'type': 'clip',
        'source': eraserId,
        'layout': {
            // specify the layer types to be removed by this clip layer
            'clip-layer-types': ['symbol', 'model']
        },
        'maxzoom': 16
    });

    // add a line layer to visualize the clipping region.
    this._map.addLayer({
        'id': uuid(),
        'type': 'line',
        'source': eraserId,
        'paint': {
            'line-color': 'rgba(255, 0, 0, 0.9)',
            'line-dasharray': [0, 4, 3],
            'line-width': 5
        }
    });

    setTimeout(() => {
      if( this._lotesRegistered.length > 0 ) {
        this.onBuildPolygonByLotesRegistered();
      }

      this._isBuildingMap.set( false );
    }, 200);

  }

  private async _buildFlatProyect( flatImage: Photo ) {

    if( !this._map ) throw new Error(`Div map container not found!!!`);
    const { urlImg } = flatImage;

    const points = this._polygonCoords.reduce<any>( (acc: number[][], current) => {
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

    setTimeout(() => {
      if( this._lotesRegistered.length > 0 ) {
        this.onBuildPolygonByLotesRegistered();
      }
    }, 200);

    setTimeout(() => {
      this._isBuildingMap.set( false );
    }, 1500);

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
    //   // Throw an error if something goes wrong.
    //   if (err) throw err;

    //   this._imageMapId = uuid();
    //   // Add the image to the map style.
    //   this._map!.addImage(this._imageMapId, image!, {
    //     pixelRatio: 3,
    //   });

    //   // Create a new layer and style it using `fill-pattern`.
    //   this._map!.addLayer({
    //     'id': uuid(),
    //     'type': 'fill',
    //     'source': polygonId,
    //     'paint': { 'fill-pattern': this._imageMapId }
    //   });

    //   this._alertService.close();

    //   if( this._lotesRegistered.length > 0 ) {
    //     this.onBuildPolygonByLotesRegistered();
    //   }

    // });

  }

  private _flyToLote( lote: Lote ) {

    const { centerCoords } = lote;

    this._map?.flyTo({
      zoom: 17.8,
      center: [ centerCoords[0], centerCoords[1] ]
    });

    this._onShowLotePopup( lote, centerCoords as LngLatLike );

  }

  private _onBuildLotePolygon( lote: Lote ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const points = lote.polygonCoords.reduce<[number, number][]>( (acc, current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const souceId = uuid();

    this._map.addSource( souceId, {
      'type': 'geojson',
      'data': {
          'type': 'Feature',
          'properties': { ...lote },
          'geometry': {
              'type': 'Polygon',
              'coordinates': [ points ],
          },
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

    const polygonFillId = uuid();

    this._map.addLayer({
      'id': polygonFillId,
      'type': 'fill',
      'source': souceId,
      'layout': {},
      'paint': {
        'fill-color': fillColor,
        'fill-opacity': 0.3,
      },
    });

    this._map.on('click', polygonFillId, (e) => {

      const feature = e.features?.find((e, i) => i == 0);
      const lote = feature?.properties as Lote;
      this._onShowLotePopup( lote, e.lngLat );

    });

    // Change the cursor to a pointer when
    // the mouse is over the states layer.
    this._map.on('mouseenter', polygonFillId, () => {
      this._map!.getCanvas().style.cursor = 'pointer';
    });

    // Change the cursor back to a pointer
    // when it leaves the states layer.
    this._map.on('mouseleave', polygonFillId, () => {
        this._map!.getCanvas().style.cursor = '';
    });


    // add a line layer to visualize the clipping region.
    this._map.addLayer({
        'id': uuid(),
        'type': 'line',
        'source': souceId,
        'paint': {
            'line-color': '#000',
            'line-dasharray': [0, 4, 3],
            'line-width': 0.7
        }
    });

  }

  private _onShowLotePopup( lote: Lote, point: LngLatLike) {

    const { code, price, squareMeters } = lote;

    const priceFormater = formatNumber( price, 'en-US', '.2-2' );

    this._popup = new Popup()
          .setLngLat( point )
          .setHTML(
            `<span class="font-extrabold text-md" >Lote: ${ code }</span><p class="text-md font-semibold">Área: ${ squareMeters } m2"<br>Precio: S/ ${ priceFormater }</p>`
          )
          .addTo(this._map!);
  }

  private _onRemoveLotePolygon( lote: Lote ) {
    this._map?.removeSource( lote.id );
  }

  ngOnDestroy(): void {
    this._map?.remove();
  }


}
