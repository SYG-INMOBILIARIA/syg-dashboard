import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Map, Marker } from 'mapbox-gl';

@Component({
  selector: 'mini-map',
  standalone: true,
  imports: [],
  templateUrl: './mini-map.component.html',
  styles: `
    div {
      width: 100%;
      height: 250px;
      margin: 0px;
      background-color: blueviolet;
    }

  `
})
export class MiniMapComponent implements AfterViewInit, OnDestroy {

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;

  @Input() coords?: [number, number];

  private _map?: Map;

  ngAfterViewInit(): void {
    if( !this.coords ) throw new Error(`Input coords no receibed!!!`);
    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: this.coords, // starting position [lng, lat]
      zoom: 14, //
      pitch: 40,
      bearing: 53,
      devtools: false,
      interactive: false
    });

    new Marker()
        .setLngLat( this.coords )
        .addTo( this._map );

  }

  ngOnDestroy(): void {
      this._map?.remove();
  }

}
