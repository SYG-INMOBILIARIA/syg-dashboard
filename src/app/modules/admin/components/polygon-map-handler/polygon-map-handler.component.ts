import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, computed, signal } from '@angular/core';
import { LngLat, LngLatLike, Map, Marker } from 'mapbox-gl';
import { MarkerAndColor, MarkerRaw, Coordinate, MapProps } from '../../interfaces';
import { CommonModule } from '@angular/common';
import { v4 as uuid } from 'uuid';
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
  @Output() updatedMapProps = new EventEmitter<MapProps>();

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
      this._isBuildingMap.set( true );
      this.onReadStorage();
      setTimeout(() => {
        this.onBuildPolygon();
      }, 400);
    } else {
      localStorage.removeItem('proyectMarkersRaw');
      this.onReadStorage();
    }
  };

  @Input() set mapProps( mapProps: MapProps | undefined ) {

    if( mapProps ) {

      const { centerCoords, bearing, pitch, zoom } = mapProps;
      this._centerMap = centerCoords;
      this._zoom = zoom;
      this._bearing = bearing;
      this._pitch = pitch;
      this._map?.setCenter( centerCoords );
      this._map?.setZoom( zoom );
      this._map?.setBearing( bearing );
      this._map?.setPitch( pitch );
    }

  }

  private _centerMap: LngLatLike = [ -80.6987307175805,-4.926770405375706 ];
  private _zoom = 14;
  private _bearing = 0;
  private _pitch = 0;
  private _map?: Map;
  private _flatImageUrl = '';

  private _isLoadingFlatImage = signal<boolean>( false );
  private _isBuildingMap = signal<boolean>( false );

  public isBuildingMap = computed( () => this._isBuildingMap() );
  public isLoadingFlatImage = computed( () => this._isLoadingFlatImage() );

  private _polygonId?: string;
  private _polygonFillId?: string;
  private _sourceImageId?: string;
  private _layerImageId?: string;

  markers: MarkerAndColor[] = [];

  get markersCount() { return this.markers.length; }

  ngAfterViewInit(): void {

    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);



    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      // style: 'mapbox://styles/mapbox/satellite-v9',
      center: this._centerMap, // starting position [lng, lat]
      zoom: this._zoom,
      bearing: this._bearing,
      pitch: this._pitch,
    });

    this._map.on( 'moveend', (event) => {

      const pitch = this._map!.getPitch();
      const bearing = this._map!.getBearing();
      const zoom = this._map!.getZoom();
      const centerCoords = this._map!.getCenter().toArray();

      this.updatedMapProps.emit( {
        centerCoords,
        pitch: +pitch.toFixed(2),
        bearing: +bearing.toFixed(2),
        zoom: +zoom.toFixed(2)
      } );

    });

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

  private _onBuildBorderProyect() {

    if( !this._map ) throw new Error('Map not loaded!!!');

    if( this._polygonFillId ) {
      this._map.removeLayer( this._polygonFillId );
    }

    this._polygonFillId = uuid();

    this._map.addLayer({
      'id': this._polygonFillId,
      'type': 'fill',
      'source': this._polygonId,
      'paint': { 'fill-color': '#2d91ff', 'fill-opacity': 0.5 }
    });

    setTimeout(() => {
      this._isBuildingMap.set( false );
      this._isLoadingFlatImage.set( false );
    }, 1000);

  }

  private _onBuildFlatProyect( urlImg: string ) {

    if( !this._map ) throw new Error('Map not loaded!!!');

    const points = this.markers.reduce<any>( (acc, current) => {

      acc.push( current.marker.getLngLat().toArray() )

      return acc;
    }, []);

    if( this._sourceImageId ) {
      this._map?.removeSource( this._sourceImageId );
    }

    if( this._layerImageId ) {
      this._map?.removeLayer( this._layerImageId );
    }

    this._sourceImageId = uuid();
    this._layerImageId  = uuid();

    // Add an image source
    this._map.addSource(this._sourceImageId, {
      'type': 'image',
      'url': urlImg,
      'coordinates': points
    });

    // Add a layer for displaying the image
    this._map.addLayer({
      'id': this._layerImageId,
      'type': 'raster',
      'source': this._sourceImageId,
      'paint': { 'raster-opacity': 1.0 }
    });

    setTimeout(() => {
      this._isBuildingMap.set( false );
      this._isLoadingFlatImage.set( false );
    }, 1600);

  }

  onBuildPolygon() {

    if( !this._map ) throw new Error('Map not loaded!!!');

    this._isLoadingFlatImage.set( true );

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
          'geometry': { 'type': 'Polygon', 'coordinates': [ points ] }
      }
    });

    if( this._flatImageUrl == environments.defaultImgUrl ) {

      this._onBuildBorderProyect();
      return;

    }

    if( this._polygonFillId ) {
      this._map.removeLayer( this._polygonFillId );
      this._polygonFillId = undefined;
    }

    this._onBuildFlatProyect( this._flatImageUrl );


    // Load an image to use as the pattern from an external URL.
    // this._map.loadImage( this._flatImageUrl, (err, image) => {
    //     // Throw an error if something goes wrong.
    //     if (err) throw err;

    //     if( this._sourceImageId ) {
    //       this._map?.removeImage( this._sourceImageId );
    //     }

    //     this._sourceImageId = uuid();
    //     // Add the image to the map style.
    //     this._map!.addImage(this._sourceImageId, image!, {
    //       pixelRatio: 3
    //     });

    //     if( this._polygonImageId ) {
    //       this._map?.removeLayer( this._polygonImageId );
    //     }

    //     this._polygonImageId = uuid();

    //     // Create a new layer and style it using `fill-pattern`.
    //     this._map!.addLayer({
    //       'id': this._polygonImageId,
    //       'type': 'fill',
    //       'source': this._polygonId,
    //       'paint': { 'fill-pattern': this._sourceImageId }
    //     });

    //     this._isLoadingFlatImage.set( false );
    //   }
    // );

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
