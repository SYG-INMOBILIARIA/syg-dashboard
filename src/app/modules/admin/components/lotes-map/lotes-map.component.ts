import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { LngLatLike, Map, Marker } from 'mapbox-gl';
import { v4 as uuid } from 'uuid';

import { Coordinate, Lote } from '../../interfaces';
import { LoteStatus } from '../../enum';
import { onBuildRandomColor } from '@shared/helpers/utils.helper';

@Component({
  selector: 'lotes-map',
  standalone: true,
  imports: [],
  templateUrl: './lotes-map.component.html',
  styleUrl: './lotes-map.component.css'
})
export class LotesMapComponent {

  @ViewChild('lotesMap') mapContainer?: ElementRef<HTMLDivElement>;

  private _map?: Map;

  @Input() set centerMap( coords: number[] ) {
    if( coords && coords.length > 0 ) {
      this._centerMap = [ coords[0], coords[1] ];
      this._zoom = 17;
      this._map?.setCenter( this._centerMap );
      this._map?.setZoom( this._zoom );
    }
  }

  @Input({ required: true }) set polygonCoords( coords: Coordinate[] ) {
    if( coords && coords.length > 0 ) {
      // this.onBuildLotes( lotes );
      this._polygonCoords = coords;
      setTimeout(() => {
        this.onBuildBorderPolygon( coords );
      }, 400);
    }
  }

  @Input({ required: false }) set flyToLote( lote: Lote | undefined ) {
    if( lote ) {
      this._flyToLote( lote );
    }
  }

  @Input({ required: true }) set lotesRegistered( lotes: Lote[] ) {
    if( lotes.length > 0 ) {
      this.onBuildLotes( lotes );
    }
  }

  private _lotesRegistered: Lote[] = [];

  private _centerMap: [number, number] = [ -80.6987307175805,-4.926770405375706 ];
  private _zoom = 17;
  private _allowDrawer = false;
  private _polygonCoords: Coordinate[] = [];

  ngAfterViewInit(): void {

    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: this._centerMap, // starting position [lng, lat]
      zoom: this._zoom, //
    });

    this._map.on('load', () => {
      this.onBuildBorderPolygon( this._polygonCoords );

      if( this._lotesRegistered.length > 0 ) {
        for ( const key in this._lotesRegistered ) {
          if (Object.prototype.hasOwnProperty.call(this._lotesRegistered, key)) {
            const lote = this._lotesRegistered[key];
            this._onBuildLotePolygon( lote );
          }
        }
      }
    });

    this._map.on('moveend', () => {
      this._centerMap = this._map?.getCenter().toArray() ?? [ -80.6987307175805,-4.926770405375706 ];
      this._zoom = this._map?.getZoom() ?? this._zoom;
    });

  }

  onBuildLotes( lotes: Lote[] ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    if( this._lotesRegistered.length > 0 ) {

      this._map?.remove();
      this._lotesRegistered = lotes;
      this.ngAfterViewInit();

    } else {

      this._lotesRegistered = lotes;

      for ( const key in lotes ) {
        if (Object.prototype.hasOwnProperty.call(lotes, key)) {
          const lote = lotes[key];
          this._onBuildLotePolygon( lote );
        }
      }

    }


  }

  onBuildBorderPolygon( polygonCoords: Coordinate[] ) {
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
                        'coordinates': [
                          points
                        ],
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

  }

  private _flyToLote( lote: Lote ) {

    const { centerCoords } = lote;

    this._map?.flyTo({
      zoom: 21,
      center: [ centerCoords[0], centerCoords[1] ]
    });

  }

  private _onBuildLotePolygon( lote: Lote ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const points = lote.polygonCoords.reduce<[number, number][]>( (acc, current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    this._map.addSource( lote.id, {
      'type': 'geojson',
      'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
              'type': 'Polygon',
              'coordinates': [ points ],
          },
      }
    })

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
      'source': lote.id,
      'paint': {
        'fill-color': fillColor,
        'fill-opacity': 0.3,
      },
    });

    this._map.addLayer({
        'id': uuid(),
        'type': 'clip',
        'source': lote.id,
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
        'source': lote.id,
        'paint': {
            'line-color': '#000',
            'line-dasharray': [0, 4, 3],
            'line-width': 0.7
        }
    });

  }

  private _onRemoveLotePolygon( lote: Lote ) {
    this._map?.removeSource( lote.id );
  }

  ngOnDestroy(): void {
    this._map?.remove();
  }


}
