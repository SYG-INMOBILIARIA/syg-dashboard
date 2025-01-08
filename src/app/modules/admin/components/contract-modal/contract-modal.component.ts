import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, forwardRef, inject, signal } from '@angular/core';
import { ContractModalModule } from './contract-modal.module';
import { FormControl, UntypedFormBuilder, Validators } from '@angular/forms';
import { descriptionPatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CustomStepper } from '@shared/components/custom-stepper/custom-stepper.component';
import { ClientService } from '../../services/client.service';
import { Client, Coordinate, Lote, Proyect } from '../../interfaces';
import { ProyectService } from '../../services/proyect.service';
import { LoteService } from '../../services/lote.service';
import { Map } from 'mapbox-gl';

import { v4 as uuid } from 'uuid';
import { LoteStatus } from '../../enum';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    ContractModalModule,
    forwardRef(() => CustomStepper ),
    CdkStepperModule
  ],
  templateUrl: './contract-modal.component.html',
  styleUrl: 'contract-modal.component.css'
})
export class ContractModalComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('myStepper') stepper?: CdkStepper;

  private _map?: Map;

  private _formBuilder = inject( UntypedFormBuilder );
  private _clientService = inject( ClientService );
  private _proyectService = inject( ProyectService );
  private _loteService = inject( LoteService );

  public searchClientInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public contractFormOne = this._formBuilder.group({
      id:            [ '', [] ],
      clientId:      [ null, [ Validators.required ] ],
      documentation: [ '', [ Validators.required, Validators.maxLength(450), Validators.pattern( descriptionPatt ) ] ],
      observation:   [ '', [ Validators.pattern( descriptionPatt ) ] ],
      // selledUserId:  [ null, [ Validators.required ] ],
  });

  public contractFormTwo = this._formBuilder.group({
    proyectId:      [ null, [ Validators.required ] ],
    loteIds:  [ [], [ Validators.required, Validators.minLength(1), Validators.maxLength(20) ] ],
  });

  public contractFormThree = this._formBuilder.group({
    paymentType:    [ null, [ Validators.required ] ],
    financingId:    [ null, [ ] ],
    quotaId:        [ null, [ ] ],
    initialAmount:  [ null, [ Validators.required, Validators.min(5000) ] ],
  });

  private _isSaving = signal( false );
  private _buildMapInProgress = signal( false );
  private _clients = signal<Client[]>( [] );
  private _proyects = signal<Proyect[]>( [] );
  private _lotes = signal<Lote[]>( [] );
  public isSaving = computed( () => this._isSaving() );
  public buildMapInProgress = computed( () => this._buildMapInProgress() );
  public clients = computed( () => this._clients() );
  public proyects = computed( () => this._proyects() );
  public lotes = computed( () => this._lotes() );

  inputErrors( field: string ) {
    return this.contractFormOne.get(field)?.errors ?? null;
  }

  get formErrors() { return this.contractFormOne.errors; }
  get invalidFormOne() { return this.contractFormOne.invalid; }

  isTouched( field: string ) {
    return this.contractFormOne.get(field)?.touched ?? false;
  }

  inputErrorsTwo( field: string ) {
    return this.contractFormTwo.get(field)?.errors ?? null;
  }

  get formErrorsTwo() { return this.contractFormTwo.errors; }

  isTouchedTwo( field: string ) {
    return this.contractFormTwo.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    this.onGetClients( 1 );
    this.onGetProyects();
  }

  ngAfterViewInit(): void {
    this.onBuildMap();
  }

  onBuildMap() {
    if( !this.mapContainer ) throw new Error(`Div map container not found!!!`);

    this._buildMapInProgress.set( true );

    this._map = new Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      // style: 'mapbox://styles/mapbox/satellite-v9', // style URL
      center: [ -80.6987307175805,-4.926770405375706 ], // starting position [lng, lat]
      zoom: 14, //
    });


  }

  onGetClients( page = 1 ) {

    this._clientService.getClients( page, '', 10 )
    .subscribe( ({ clients, total }) => {

      this._clients.set( clients );
    });
  }

  onGetProyects() {
    this._proyectService.getProyects( 1, '', 20 )
    .subscribe( ({ proyects, total }) => {

      this._proyects.set( proyects );
    });
  }

  onSearchClient(  ) {

    const pattern = this.searchClientInput.value ?? '';

    this._clientService.getClients( 1, pattern, 20 )
    .subscribe( ({ clients, total }) => {

      this._clients.set( clients );
      this.searchClientInput.reset();
    });

  }

  onBuildLotes( lotes: Lote[] ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    for ( const key in lotes ) {
      if (Object.prototype.hasOwnProperty.call(lotes, key)) {

        const lote = lotes[key];
        this._onBuilLotePolygon( lote );

      }
    }

  }

  private _onBuilLotePolygon( lote: Lote ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const points = lote.polygonCoords.reduce<[number, number][]>( (acc, current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const sourceId = uuid();

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

    this._map.addLayer({
        'id': uuid(),
        'type': 'clip',
        'source': sourceId,
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
        'source': sourceId,
        'paint': {
            'line-color': '#000',
            'line-dasharray': [0, 4, 3],
            'line-width': 0.7
        }
    });

  }

  onBuildBorderProyect( polygonCoords: Coordinate[] ) {
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

  onChangeClient( event: any ) {
    console.log({event});
  }

  onChangeProyect( proyectId: string ) {

    forkJoin({
      proyectByIdResponse: this._proyectService.getProyectById( proyectId ),
      lotesResponse: this._loteService.getLotes( proyectId, 1, '', 500 ),
    }).subscribe( ( { proyectByIdResponse, lotesResponse } ) => {

      const { polygonCoords, centerCoords } = proyectByIdResponse;
      const { lotes, total } = lotesResponse;

      this._lotes.set( lotes );

      this._map?.remove();
      this.onBuildMap();

      this._map?.on('load', () => {

        this._map?.flyTo({
          zoom: 17,
          center: centerCoords
        });
        this.onBuildBorderProyect( polygonCoords );
        this.onBuildLotes( lotes );
        this._buildMapInProgress.set( false );
      });


    });
  }

  onResetAfterSubmit() {

  }

  onSubmit() {

  }

  onNextLoteStep() {

    if( this.invalidFormOne ) {

      this.contractFormOne.markAllAsTouched();
      return ;
    }

    this.stepper?.next();
    setTimeout(() => {
      this._map?.resize();
    }, 50);

  }


  ngOnDestroy(): void {

  }

}
