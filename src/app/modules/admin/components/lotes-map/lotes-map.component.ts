import { Component, ElementRef, Input, ViewChild, computed, signal } from '@angular/core';
import { LngLatLike, Map, Popup } from 'mapbox-gl';

import { Coordinate, Lote, Proyect } from '../../interfaces';
import { LoteStatus } from '../../enum';
import { CommonModule } from '@angular/common';
import { Photo } from '@shared/interfaces';

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
  //FIXME: nueva lógica para mostrar lotes
  private _popup: Popup = new Popup({ closeButton: true, closeOnClick: false });
  private hoveredId: string | number | null = null;
  private selectedId: string | number | null = null;

  private readonly SOURCE_ID        = 'lotesSource';
  private readonly FILL_ID          = 'lotes-fill';
  private readonly DASHED_LINE_ID   = 'lotes-dashed-line';
  private readonly FLAT_SOURCE_ID   = 'lotes-flat-image-source';
  private readonly FLAT_LAYER_ID    = 'lotes-flat-image-layer';
  private readonly FLAT_BORDER_SOURCE_ID   = 'lotes-flat-border';

  private readonly _emptyImage = '/assets/img/empty.png';
  //FIXME: nueva lógica para mostrar lotes

  private _flatImage?: Photo;

  @Input({ required: true }) set project( project: Proyect | undefined ) {

    if( project ) {

      const { centerCoords, polygonCoords, flatImage, bearingMap, pitchMap, zoomMap } = project;

      this._map?.setCenter( centerCoords );
      this._map?.setZoom( zoomMap );
      this._map?.setBearing( bearingMap );
      this._map?.setPitch( pitchMap );
      this._polygonCoords = polygonCoords;
      this._flatImage = flatImage;

      // if( this._flatImage ) {
      //   this._buildFlatProyect( this._flatImage );
      // } else {
      //   this._onBuildBorderPolygon( this._polygonCoords );
      // }
    }

  }

  @Input({ required: true }) set lotes( lotes: Lote[] ) {
    // this._lotesRegistered = lotes;x
    if( lotes.length > 0 ) {
      this.onBuildPolygonByLotesRegistered( lotes );
    }
  }

  @Input({ required: false }) set flyToLote( lote: Lote | undefined ) {
    if( lote ) {
      this._flyToLote( lote );
    }
  }

  @Input({ required: true }) set showLoading( value: boolean ) {
    this._isBuildingMap.set( value );
  }

  @Input({ required: true }) set showLock( value: { show: boolean, text: string } ) {
    this._showLockContainer.set( value.show );
    this._lockContainerText.set( value.text );
  }

  private _showLockContainer = signal<boolean>( false );
  private _lockContainerText = signal<string>( '' );

  private _polygonCoords: Coordinate[] = [];

  private _isBuildingMap = signal<boolean>( false );

  public isBuildingMap = computed( () => this._isBuildingMap() );
  public showLockContainer = computed( () => this._showLockContainer() );
  public lockContainerText = computed( () => this._lockContainerText() );

  ngAfterViewInit(): void {

    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: [ -80.6987307175805,-4.926770405375706 ], // starting position [lng, lat]
      zoom: 17,
      bearing: 0,
      pitch: 0
    });

    this._map.on('load', () => {

      this._onAddMapxboxElements();
      this._onAddMapboxEvents();

      if( this._flatImage ) {
        this._buildFlatProyect( this._flatImage );
      } else {
        this._onBuildBorderPolygon( this._polygonCoords );
      }
    });
  }

  private _onAddMapxboxElements() {

    if( !this._map ) throw new Error(`Map not found!!!`);

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
      paint: {
        'raster-opacity': 0.85  // ← opacidad del plano
      }
    });

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
        'fill-color': [
          'match', ['get', 'loteStatus'],
          'AVAILABLE', '#67e8f9',
          'SELLED',    '#31c48d',
          'RESERVED',   '#FFDC42',
          'IN_PROGRESS','#6b7280',
          /* default */ '#67e8f9'
        ],
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

    // eventos UNA sola vez sobre el layer
    this._map.on('mousemove', this.FILL_ID, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = f.id as string | number;
      if (this.hoveredId !== null && this.hoveredId !== id) {
        this._map!.setFeatureState({ source: this.SOURCE_ID, id: this.hoveredId }, { hovered: false });
      }
      this.hoveredId = id;
      this._map!.setFeatureState({ source: this.SOURCE_ID, id }, { hovered: true });
      this._map!.getCanvas().style.cursor = 'pointer';
    });

    this._map.on('mouseleave', this.FILL_ID, () => {
      if (this.hoveredId !== null) {
        this._map!.setFeatureState({ source: this.SOURCE_ID, id: this.hoveredId }, { hovered: false });
        this.hoveredId = null;
      }
      this._map!.getCanvas().style.cursor = '';
    });

    this._map.on('click', this.FILL_ID, (e) => {
      const f = e.features?.[0]; if (!f) return;
      const id = f.id as string | number;

      // quitar selección anterior
      if (this.selectedId !== null) {
        this._map!.setFeatureState({ source: this.SOURCE_ID, id: this.selectedId }, { selected: false });
      }
      this.selectedId = id;
      this._map!.setFeatureState({ source: this.SOURCE_ID, id }, { selected: true });

      const lote = f.properties as Lote;
      const { price, squareMeters, mz, numberLote } = lote;

      let popupHtml = `
        <span class="font-extrabold text-md text-blue-500">Lote: ${mz}-${ numberLote }</span>
        <p class="text-md font-semibold">
          Área: ${squareMeters} m²<br>
          Precio: <span class="font-extrabold text-md text-green-500">S/ ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </p>`;

        let color = 'green';
        let estado = 'Vendido';
        switch (lote.loteStatus) {
          case LoteStatus.Reserved:
            color = 'yellow';
            estado = 'Reservado';
            break;

            case LoteStatus.Selled:
              color = 'green';
              estado = 'Vendido';
              break;

          default:
            color = 'slate';
            estado = 'En progreso';
            break;
        }

        if( lote.loteStatus != LoteStatus.Available ) {
          popupHtml += `
            <div class="flex justify-start items-center pt-1" >
              <div class="w-4 h-4 bg-${color}-500 border-2 border-${color}-500 rounded-full dark:border-gray-900 mr-4"></div>
              <span class="text-${color}-600 font-semibold">
                ${ estado }
              </span>
            </div>
          `;
        }

      this._popup.setLngLat(e.lngLat).setHTML(popupHtml).addTo(this._map!);
    });

  }

  onBuildPolygonByLotesRegistered( lotes: Lote[] ) {

    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const source = this._map.getSource(this.SOURCE_ID) as mapboxgl.GeoJSONSource;

    if (!source) {
      console.warn(`⚠️ Source ${this.SOURCE_ID} no existe todavía ⚠️`);
      return;
    }

    const features = lotes.map( (lote) => ({
        type: 'Feature',
        id: lote.id, // <- clave para feature-state
        properties: { ...lote },
        geometry: {
          type: 'Polygon',
          coordinates: [ lote.polygonCoords.map(p => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]) ],
          // coordinates: points,
        }
    }));

    const fc = { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
    (this._map.getSource(this.SOURCE_ID) as mapboxgl.GeoJSONSource).setData(fc);

  }

  private _onBuildBorderPolygon( polygonCoords: Coordinate[] ) {
    if( !polygonCoords ) throw new Error(`PolygonCoords undefined!!!`);
    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const points = polygonCoords.reduce<number[][]>( (acc: number[][], current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const features = [{
      'type': 'Feature',
      'properties': {},
      'geometry': {
          'coordinates': [ ...points ],
          'type': 'Polygon'
      }
    }];

    const fc = { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
    (this._map!.getSource<mapboxgl.GeoJSONSource>(this.FLAT_BORDER_SOURCE_ID))?.setData(fc);

  }

  private async _buildFlatProyect( flatImage: Photo ) {

    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const source = this._map.getSource(this.FLAT_SOURCE_ID) as mapboxgl.ImageSource;

    if (!source) {
      console.warn(`⚠️ Source ${this.FLAT_SOURCE_ID} no existe todavía ⚠️`);
      return;
    }

    const { urlImg } = flatImage;

    const points = this._polygonCoords.reduce<any>( (acc: number[][], current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    (this._map.getSource( this.FLAT_SOURCE_ID) as mapboxgl.ImageSource).updateImage({
      url: urlImg,
      coordinates: points
    });

  }

  private _flyToLote( lote: Lote ) {

    const { centerCoords, zoomMap, bearingMap, pitchMap } = lote;

    this._map?.flyTo({
      zoom: zoomMap,
      bearing: bearingMap,
      pitch: pitchMap,
      center: ( centerCoords as LngLatLike )
    });

    this._onShowLotePopup( lote, centerCoords as LngLatLike );

  }

  private _onShowLotePopup( lote: Lote, coords: LngLatLike) {

    const { price, squareMeters, mz, numberLote } = lote;

    const html = `
        <span class="font-extrabold text-md text-blue-500">Lote: ${mz}-${numberLote}</span>
        <p class="text-md font-semibold">
          Área: ${squareMeters} m²<br>
          Precio: <span class="font-extrabold text-md text-green-500">S/ ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </p>`;
      this._popup.setLngLat( coords ).setHTML(html).addTo(this._map!);
  }

  ngOnDestroy(): void {
    this._map?.remove();
  }


}
