import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, computed, signal } from '@angular/core';
import { LngLat, LngLatLike, Map, Marker, Point } from 'mapbox-gl';
import MapboxDraw, { DrawFeature } from "@mapbox/mapbox-gl-draw";
import { MarkerAndColor, MarkerRaw, Coordinate } from '../../interfaces';
import { CommonModule } from '@angular/common';
import { v4 as uuid } from 'uuid';
import * as turf from '@turf/turf';
import { environments } from '@envs/environments';
import { onBuildRandomColor } from '@shared/helpers/utils.helper';

@Component({
  selector: 'polygon-map-handler',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './polygon-map-handler.component.html',
  styleUrl: './polygon-map-handler.component.css'
})
export class PolygonMapHandlerComponent implements AfterViewInit, OnDestroy {

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;

  @Output() updatedPolygonCoords = new EventEmitter<number[][]>();
  @Output() updatedCenterCoord = new EventEmitter<number[]>();

  @Input({ required: true }) set flatImageUrl( value: string ) {
    this._flatImageUrl = value;
  };

  @Input({ required: true }) set polygonCoords( coords: Coordinate[] ) {
    if( coords.length > 0 ) {

      localStorage.removeItem('proyectMarkersRaw');
      const markersRaw = coords.reduce<MarkerRaw[]>( (acc, coordinate) => {

        acc.push({
          id: coordinate.id,
          color: onBuildRandomColor(),
          coors: [ coordinate.lng, coordinate.lat ]
        });

        return acc;
      }, []);

      localStorage.setItem('proyectMarkersRaw', JSON.stringify( markersRaw ));

      this.onReadStorage();
      setTimeout(() => {
        this.onBuildPolygon();
      }, 400);
    } else {
      localStorage.removeItem('proyectMarkersRaw');
      this.onReadStorage();
    }
  };

  @Input() set centerMap( coords: [number, number] | undefined ) {

    if( coords ) {
      this._centerMap = coords;
      this._zoom = 17.5;
      this._map?.setCenter( coords );
      this._map?.setZoom( 17.5 );
    }

  }

  private _centerMap: LngLatLike = [ -80.6987307175805,-4.926770405375706 ];
  private _zoom = 14;
  private _map?: Map;
  private _draw?: MapboxDraw;
  private _flatImageUrl = '';

  private _isLoadingFlatImage = signal<boolean>( false );
  public isLoadingFlatImage = computed( () => this._isLoadingFlatImage() );

  private _polygonId?: string;
  private _polygonFillId?: string;
  private _polygonImageId?: string;
  private _sourceImageId?: string;

  markers: MarkerAndColor[] = [];

  ngAfterViewInit(): void {

    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      // style: 'mapbox://styles/mapbox/satellite-v9',
      center: this._centerMap, // starting position [lng, lat]
      zoom: this._zoom, //
    });

    this._map.on( 'moveend', (event) => {
      this.updatedCenterCoord.emit( this._map?.getCenter().toArray() );
    });

    // const _draw = new MapboxDraw({
    //     displayControlsDefault: false,
    //     // Select which mapbox-gl-draw control buttons to add to the map.
    //     controls: {
    //         polygon: true,
    //         trash: true,
    //     },
    //     // Set mapbox-gl-draw to draw by default.
    //     // The user does not have to click the polygon control button first.
    //     defaultMode: 'draw_polygon',
    //     boxSelect: true
    // });
    // this._map.addControl(_draw);

    // this._map.on('draw.create', updateArea);
    // this._map.on('draw.delete', updateArea);
    // this._map.on('draw.update', updateArea);

    // function updateArea(e: any) {

    //   if( !_draw ) throw new Error('Draw no loaded!!');

    //   const data = _draw.getAll();
    //   console.log({data});
    //   const answer = document.getElementById('calculated-area');
    //   if (data.features.length > 0) {
    //       const area = turf.area(data);
    //       // Restrict the area to 2 decimal points.
    //       const rounded_area = Math.round(area * 100) / 100;
    //       console.log({area: rounded_area});
    //       answer!.innerHTML = `<p><strong>${rounded_area}</strong></p><p>square meters</p>`;
    //   } else {
    //       answer!.innerHTML = '';
    //       if (e.type !== 'draw.delete')
    //           alert('Click the map to draw a polygon.');
    //   }
    // }


    // this.onReadStorage();

    this.onReadStorage();
  }

  createMarker() {
    if( !this._map ) return;

    const color = onBuildRandomColor();
    const lngLat = this._map.getCenter();

    this.addMarker( lngLat, color );

    this.onSaveStorage();
  }

  addMarker( lngLat: LngLat, color: string ) {

    if( !this._map ) return;

    const marker = new Marker({ color, draggable: true })
                        .setLngLat( lngLat )
                        .addTo( this._map );

    this.markers.push({ marker, color });

    this.onSaveStorage();

    marker.on('dragend', () => this.onSaveStorage() );

  }

  onBuildPolygon() {

    if( !this._map ) throw new Error('Map not loaded!!!');

    this.markers.forEach( (element) => {
      element.marker.remove();
    });

    this.onReadStorage();

    const points = this.markers.reduce<[number, number][]>( (acc, current) => {

      acc.push( current.marker.getLngLat().toArray() )

      return acc;
    }, []);

    this.updatedPolygonCoords.emit( points );

    if( this._polygonId ) {
      this._map.removeSource( this._polygonId );
    }

    this._polygonId = uuid();

    this._map.addSource( this._polygonId, {
      'type': 'geojson',
      'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
              'type': 'Polygon',
              'coordinates': [
                points
              ]
          }
      }
    });

    if( this._flatImageUrl == environments.defaultImgUrl ) {

      if( this._polygonFillId ) {
        this._map.removeLayer( this._polygonFillId );
      }

      this._polygonFillId = uuid();

      this._map.addLayer({
        'id': this._polygonFillId,
        'type': 'fill',
        'source': this._polygonId,
        'paint': {
          'fill-color': '#2d91ff',
          'fill-opacity': 0.5
        }
      });
      return ;
    }

    this._isLoadingFlatImage.set( true );
    // Load an image to use as the pattern from an external URL.
    this._map.loadImage( this._flatImageUrl, (err, image) => {
        // Throw an error if something goes wrong.
        if (err) throw err;

        if( this._sourceImageId ) {
          this._map?.removeImage( this._sourceImageId );
        }

        this._sourceImageId = uuid();
        // Add the image to the map style.
        this._map!.addImage(this._sourceImageId, image!);

        if( this._polygonImageId ) {
          this._map?.removeLayer( this._polygonImageId );
        }

        this._polygonImageId = uuid();

        // Create a new layer and style it using `fill-pattern`.
        this._map!.addLayer({
          'id': this._polygonImageId,
          'type': 'fill',
          'source': this._polygonId,
          'paint': {
              'fill-pattern': this._sourceImageId
          }
        });

        this._isLoadingFlatImage.set( false );
      }
    );

  }

  onSaveStorage() {

    const markersRaw = this.markers.reduce<MarkerRaw[]>( (acc, current) => {

      acc.push({
        color: current.color,
        coors: current.marker.getLngLat().toArray()
      });

      return acc;
    }, []);

    localStorage.setItem('proyectMarkersRaw', JSON.stringify( markersRaw ));

  }

  onReadStorage() {
    const markersRawString = localStorage.getItem('proyectMarkersRaw') ?? '[]';
    const markersRaw: MarkerRaw[] = JSON.parse( markersRawString );

    this.markers = [];

    markersRaw.forEach( ({ color, coors}) => {
      const [ lng, lat ] = coors;
      const lngLat = new LngLat( lng, lat );
      this.addMarker( lngLat, color );
    });

    // console.log(this.markers);
  }

  onRemoveMarker( index: number ) {
    this.markers[ index ].marker.remove();
    this.markers.splice( index, 1 );
  }

  onFlyTo( marker: Marker ) {
    if( !this._map ) return;

    this._map.flyTo({
      zoom: 18.6,
      center: marker.getLngLat()
    });

  }

  ngOnDestroy(): void {
    this._map?.remove();
  }

}
