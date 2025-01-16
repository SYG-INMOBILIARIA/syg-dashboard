import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import { Map, Marker } from 'mapbox-gl';
import { v4 as uuid } from 'uuid';
import { CommonModule } from '@angular/common';

import { Coordinate, Proyect } from '../../../modules/admin/interfaces';
import { Photo } from '@shared/interfaces';

@Component({
  selector: 'mini-map',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './mini-map.component.html',
  styles: `
    #divMap {
      width: 100%;
      height: 250px;
      margin: 0px;
      // background-color: blueviolet;
    }

  `
})
export class MiniMapComponent implements AfterViewInit, OnDestroy {

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;

  @Input({ required: true }) set proyect( protect: Proyect ) {
    this._proyect = protect;
  }

  private _map?: Map;
  private _proyect?: Proyect;
  private _polygonId?: string;

  private _isBuildingMap = signal<boolean>( false );

  public isBuildingMap = computed( () => this._isBuildingMap() );

  ngAfterViewInit(): void {
    if( !this._proyect ) throw new Error(`Input proyect no receibed!!!`);
    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    const { centerCoords, zoomMap, pitchMap, bearingMap, flatImage, polygonCoords } = this._proyect;

    this._isBuildingMap.set( true );

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: centerCoords, // starting position [lng, lat]
      zoom: zoomMap - 1.5, //
      pitch: pitchMap,
      bearing: bearingMap,
      devtools: false,
      interactive: false
    });


    this._onBuildPolygon( polygonCoords, flatImage );


    // new Marker()
    //     .setLngLat( this.coords )
    //     .addTo( this._map );

  }

  private _onBuildPolygon( polygonCoords: Coordinate[], flatImage?: Photo ) {

    if( !this._map ) throw new Error(`Map no loaded!!!`);

    const points = polygonCoords.reduce<any>( (acc, current) => {
      acc.push( [ current.lng, current.lat ] )
      return acc;
    }, []);

    this._map.on('load', () => {

      this._polygonId = uuid();

      this._map!.addSource( this._polygonId, {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': { 'type': 'Polygon', 'coordinates': [ points ] }
        }
      });

      if( flatImage ) {
        this._onBuildFlatProyect( flatImage.urlImg, points );
      } else {
        this._onBuildBorderProyect( points );
      }

    });
  }

  private _onBuildBorderProyect( points: any ) {

    if( !this._map ) throw new Error('Map not loaded!!!');


    this._map.addLayer({
      'id': uuid(),
      'type': 'fill',
      'source': this._polygonId,
      'paint': { 'fill-color': '#2d91ff', 'fill-opacity': 0.5 }
    });

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
      this._isBuildingMap.set( false );
    }, 900);

  }

  private _onBuildFlatProyect( urlImg: string, points: any ) {

    if( !this._map ) throw new Error('Map not loaded!!!');

    const sourceImageId = uuid();

    // Add an image source
    this._map.addSource( sourceImageId, {
      'type': 'image',
      'url': urlImg,
      'coordinates': points
    });

    // Add a layer for displaying the image
    this._map.addLayer({
      'id': uuid(),
      'type': 'raster',
      'source': sourceImageId,
      'paint': { 'raster-opacity': 1.0 }
    });

    setTimeout(() => {
      this._isBuildingMap.set( false );
    }, 1600);

  }

  ngOnDestroy(): void {
      this._map?.remove();
  }

}
