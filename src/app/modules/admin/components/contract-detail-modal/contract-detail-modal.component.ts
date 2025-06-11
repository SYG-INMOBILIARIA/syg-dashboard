import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, computed, forwardRef, inject, signal } from '@angular/core';
import { ContractDetailModalModule } from './contract-detail-modal.module';
import { AlertService } from '@shared/services/alert.service';
import { ContractService } from '../../services/contract.service';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CustomStepper } from '@shared/components/custom-stepper/custom-stepper.component';
import { ContractByID, Coordinate, Lote, ContractQuote } from '../../interfaces';
import { Map, Popup } from 'mapbox-gl';
import { LoteStatus, PaymentType } from '../../enum';
import { forkJoin } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Photo } from '@shared/interfaces';
import { formatNumber } from '@angular/common';

@Component({
  selector: 'contract-detail-modal',
  standalone: true,
  imports: [
    ContractDetailModalModule,
    forwardRef(() => CustomStepper ),
    CdkStepperModule
  ],
  templateUrl: './contract-detail-modal.component.html',
  styles: `
    #map {
      width: 100%;
      height: 430px;
      margin: 0px;
      /* background-color: blueviolet; */
    }
  `
})
export class ContractDetailModalComponent implements AfterViewInit, OnDestroy {

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('myStepper') stepper?: CdkStepper;

  @Input({ required: true }) set contractId( value: string | null ) {

    if( value ) {
      this._contractId = value;
      this.onLoadContract();
    }
  }

  private _map?: Map;
  private _popup?: Popup;

  private _alertService = inject( AlertService );
  private _contractService = inject( ContractService );

  private _contractId?: string;
  private _contractById = signal<ContractByID | null>( null );
  private _isBuildingMap = signal<boolean>( false );

  public isBuildingMap = computed( () => this._isBuildingMap() );
  public contractById = computed( () => this._contractById() );
  public clients = computed( () => this._contractById()?.clients );
  public lotes = computed( () => this._contractById()?.lotes ?? [] );
  public proyect = computed( () => this._contractById()?.proyect );

  private _polygonCoords: Coordinate[] = [];

  get isPaymentToCash() {
    return this.contractById()?.paymentType == PaymentType.cash;
  }

  get lotesAmount() {
    return this.contractById()?.loteAmount ?? 0;
  }

  get interestPercent() {
    return this.contractById()?.interestPercent ?? 0;
  }

  get amountToFinancing() {
    return this.contractById()?.amountToFinancing ?? 0;
  }

  get amountToQuota() {
    return this.contractById()?.quotesAmount ?? 0;
  }

  get numberOfQuotes() {
    return this.contractById()?.numberOfQuotes ?? 0;
  }

  ngAfterViewInit(): void {
    this.onBuildMap();
  }

  onBuildMap() {
    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: [ -80.6987307175805,-4.926770405375706 ], // starting position [lng, lat]
      zoom: 14, //
    });

    this._isBuildingMap.set( true );
  }

  onLoadContract() {

    if( !this._contractId ) throw new Error('Not recibed contractId');

    this._alertService.showLoading();

    this._map?.remove();
    this.onBuildMap();

    this._contractService.getContractById( this._contractId )
    .subscribe( ( contractById ) => {

      const { proyect } = contractById;

      this._polygonCoords = proyect.polygonCoords;

      this._contractById.set( contractById );

      if( proyect.flatImage ) {
        this._buildFlatProyect( proyect.flatImage );
      } else {
        this._onBuildBorderProyect();
      }

    });

  }

  onMapInterective( index: number ) {

    if( index == 1 ) {
      setTimeout(() => {
        this._map?.resize();
      }, 50);
    }
  }

  onBuildLotes( lotes: Lote[] ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    lotes.forEach(lote => {
      this._onBuilLotePolygon( lote );
    });

    const lote = lotes[0];
    if( lote ) {
      this._map.flyTo({
        center: lote.centerCoords as [number, number],
        zoom: 17.9
      })
    }

    this.onShowLotePopupInHover();

    this._alertService.close();

  }

  private _onBuilLotePolygon( lote: Lote ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const points = lote.polygonCoords.reduce<[number, number][]>( (acc, current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    this._map.addSource( lote.id, {
      'type': 'geojson',
      'data': {
          'type': 'Feature',
          'properties': {
            ...lote
          },
          'geometry': {
              'type': 'Polygon',
              'coordinates': [ points ]
          }
      }
    });


    this._map.addLayer({
      'id': lote.id,
      'type': 'fill',
      'source': lote.id,
      'paint': {
        'fill-color': '#1c64f2 ',
        'fill-opacity': 0.3
      },
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

  private _onBuildBorderProyect() {
    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const points = this._polygonCoords.reduce<number[][]>( (acc: number[][], current) => {
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

    this.onBuildLotes( this.lotes() );

    setTimeout(() => {
      this._isBuildingMap.set( false );
    }, 1000);

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

    this.onBuildLotes( this.lotes() );

    setTimeout(() => {
      this._isBuildingMap.set( false );
    }, 1600);

    // const polygonId = uuid();

    // this._map.addSource( polygonId, {
    //   'type': 'geojson',
    //   'data': {
    //       'type': 'Feature',
    //       'properties': {},
    //       'geometry': {
    //           'type': 'Polygon',
    //           'coordinates': [
    //             points
    //           ]
    //       }
    //   }
    // });

    // this._map.loadImage( urlImg, (err, image) => {
    //   // Throw an error if something goes wrong.
    //   if (err) throw err;

    //   const imageId = uuid();
    //   // Add the image to the map style.
    //   this._map!.addImage(imageId, image!, {
    //     pixelRatio: 3,
    //   });


    //   // Create a new layer and style it using `fill-pattern`.
    //   this._map!.addLayer({
    //     'id': uuid(),
    //     'type': 'fill',
    //     'source': polygonId,
    //     'paint': { 'fill-pattern': imageId }
    //   });

    //   this.onBuildLotes( this.lotes() ?? [] );

    // });

  }

  onShowLotePopupInHover() {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const lotes = this.lotes() ?? [];

    for (const key in lotes) {
      if (Object.prototype.hasOwnProperty.call(lotes, key)) {
        const lote = lotes[key];

        const { code, squareMeters, price } = lote;
        const priceFormater = formatNumber( price, 'en-US', '.2-2' );

        // When the user moves their mouse over the state-fill layer, we'll update the
        // feature state for the feature under the mouse.

        let popupHtml = `
          <span class="font-extrabold text-md" >
            Lote: ${ code }
          </span>
          <p class="text-md font-semibold">
            Área: ${ squareMeters } m2"<br>
            Precio: S/ ${ priceFormater }
          </p>
        `;

        this._map.on('mousemove', lote.id, (e) => {

          this._popup?.remove();
          this._popup = new Popup()
            .setLngLat( e.lngLat )
            .setHTML( popupHtml )
            .addTo(this._map!);

        });

        // When the mouse leaves the state-fill layer, update the feature state of the
        // previously hovered feature.
        this._map.on('mouseleave', lote.id, () => {
          this._popup?.remove();
        });
      }
    }

  }

  onReset() {

  }

  ngOnDestroy(): void {
    this._map?.remove();
  }


}
