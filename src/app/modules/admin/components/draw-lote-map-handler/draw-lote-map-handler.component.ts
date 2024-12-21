import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { LngLatLike, Map } from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { v4 as uuid } from 'uuid';
import * as turf from '@turf/turf';

import { Lote } from '../../interfaces';

@Component({
  selector: 'draw-lote-map-handler',
  standalone: true,
  imports: [

  ],
  templateUrl: './draw-lote-map-handler.component.html',
  styleUrl: './draw-lote-map-handler.component.css'
})
export class DrawLoteMapHandlerComponent implements AfterViewInit, OnDestroy {

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;

  private _map?: Map;

  @Input() set isAllowDrawer( value: boolean ) {
    this._allowDrawer = value ?? false;

    if( this._allowDrawer ) {
      // setTimeout(() => {
      //   this.onAllowDrawer();
      // }, 400);
    }

  }

  @Input() set centerMap( coords: [number, number] | undefined ) {
    if( coords ) {
      this._centerMap = coords;
      this._zoom = 17.5;
      this._map?.setCenter( coords );
      this._map?.setZoom( 17.5 );
    }
  }

  @Input({ required: true }) set lotesRegistered( lotes: Lote[] ) {
    if( lotes.length > 0 ) {
      this.onBuildLotes( lotes );
    }
  }

  private _centerMap: LngLatLike = [ -80.6987307175805,-4.926770405375706 ];
  private _zoom = 14;
  private _allowDrawer = false;

  ngAfterViewInit(): void {

    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      // style: 'mapbox://styles/mapbox/satellite-v9', // style URL
      center: this._centerMap, // starting position [lng, lat]
      zoom: this._zoom, //
    });

    this._map.on( 'moveend', (event) => {
      // this.updatedCenterCoord.emit( this._map?.getCenter().toArray() );
    });

    this.onAllowDrawer();

  }

  onAllowDrawer() {

    console.log('onAllowDrawer');

    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const _draw = new MapboxDraw({
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

  this._map.addControl( _draw );

  this._map.on('draw.create', updateArea);
  this._map.on('draw.delete', updateArea);
  this._map.on('draw.update', updateArea);

  function updateArea(e: any) {

    if( !_draw ) throw new Error('Draw no loaded!!');

    const data = _draw.getAll();
    console.log({data});
    const answer = document.getElementById('calculated-area');
    if (data.features.length > 0) {
        const area = turf.area(data);
        // Restrict the area to 2 decimal points.
        const rounded_area = Math.round(area * 100) / 100;
        console.log({area: rounded_area});
        // answer!.innerHTML = `<p><strong>${rounded_area}</strong></p><p>square meters</p>`;
    } else {
        // answer!.innerHTML = '';
        if (e.type !== 'draw.delete')
            alert('Click the map to draw a polygon.');
    }
  }
  }

  onBuildLotes( lotes: Lote[] ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    for ( const key in lotes ) {
      if (Object.prototype.hasOwnProperty.call(lotes, key)) {

        const lote = lotes[key];
        this._onBuildDPolygon( lote );

      }
    }

  }

  private _onBuildDPolygon( lote: Lote ) {

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
              'coordinates': [ points ]
          }
      }
    });

    this._map.addLayer({
      'id': uuid(),
      'type': 'fill',
      'source': lote.id,
      'layout': {
        'text-field': lote.code
      },
      'paint': {
        'fill-color': '#2d91ff',
        'fill-opacity': 0.5
      }
    });

  }

  ngOnDestroy(): void {
    this._map?.remove();
  }

}
