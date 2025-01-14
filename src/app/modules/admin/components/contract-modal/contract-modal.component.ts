import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, computed, forwardRef, inject, signal } from '@angular/core';
import { ContractModalModule } from './contract-modal.module';
import { FormControl, UntypedFormBuilder, Validators } from '@angular/forms';
import { descriptionPatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CustomStepper } from '@shared/components/custom-stepper/custom-stepper.component';
import { ClientService } from '../../services/client.service';
import { Client, Contract, ContractFormOne, ContractFormThree, ContractFormTwo, Coordinate, Financing, Lote, LoteSelectedInMap, Proyect, Quota } from '../../interfaces';
import { ProyectService } from '../../services/proyect.service';
import { LoteService } from '../../services/lote.service';
import { Map, PointLike, Popup } from 'mapbox-gl';

import { v4 as uuid } from 'uuid';
import { FinancingType, LoteStatus, PaymentType } from '../../enum';
import { forkJoin } from 'rxjs';
import { Nomenclature, Photo } from '@shared/interfaces';
import { FinancingService } from '../../services/financing.service';
import { initFlowbite } from 'flowbite';
import { ContractService } from '../../services/contract.service';
import { formatNumber } from '@angular/common';
import { UserService } from '../../../security/services/user.service';
import { User } from '../../../security/interfaces';
import { AlertService } from '@shared/services/alert.service';

@Component({
  selector: 'contract-modal',
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


  @ViewChild('btnCloseContractModal') btnCloseContractModal?: ElementRef<HTMLButtonElement>;
  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('myStepper') stepper?: CdkStepper;

  @Output() onCreated = new EventEmitter<Contract | undefined>();

  @Input({ required: true }) paymentTypes!: Nomenclature[];

  private _map?: Map;
  private _popup?: Popup;

  private _formBuilder = inject( UntypedFormBuilder );
  private _clientService = inject( ClientService );
  private _proyectService = inject( ProyectService );
  private _loteService = inject( LoteService );
  private _contractService = inject( ContractService );
  private _financingService = inject( FinancingService );
  private _userService = inject( UserService );
  private _alertService = inject( AlertService );

  public searchClientInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public searchUserInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public contractFormOne = this._formBuilder.group({
      clientId:      [ null, [ Validators.required ] ],
      documentation: [ '', [ Validators.required, Validators.maxLength(450), Validators.pattern( descriptionPatt ) ] ],
      observation:   [ '', [ Validators.pattern( descriptionPatt ) ] ],
      selledUserId:  [ null, [ Validators.required ] ],
  });

  public contractFormTwo = this._formBuilder.group({
    proyectId:  [ null, [ Validators.required ] ],
    loteIds:    [ [], [ Validators.required, Validators.minLength(1), Validators.maxLength(20) ] ], //Validators.minLength(1), Validators.maxLength(20)
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
  private _users = signal<User[]>( [] );
  private _proyects = signal<Proyect[]>( [] );
  private _lotes = signal<Lote[]>( [] );
  private _lotesBusied = signal<Lote[]>( [] );
  private _lotesSelected = signal<LoteSelectedInMap[]>( [] );

  private _financings = signal<Financing[]>( [] );
  private _quotas = signal<Quota[]>( [] );

  private _lotesAmount = signal<number>( 0 );
  private _interestPercent = signal<number>( 0 );
  private _amountToFinancing = signal<number>( 0 );
  private _amountToQuota = signal<number>( 0 );

  public isSaving = computed( () => this._isSaving() );
  public buildMapInProgress = computed( () => this._buildMapInProgress() );
  public clients = computed( () => this._clients() );
  public users = computed( () => this._users() );
  public proyects = computed( () => this._proyects() );
  public lotes = computed( () => this._lotes() );
  public lotesBusied = computed( () => this._lotesBusied() );
  public lotesSelected = computed( () => this._lotesSelected() );
  public financings = computed( () => this._financings() );
  public quotas = computed( () => this._quotas() );
  public lotesAmount = computed( () => this._lotesAmount() );
  public interestPercent = computed( () => this._interestPercent() );
  public amountToFinancing = computed( () => this._amountToFinancing() );
  public amountToQuota = computed( () => this._amountToQuota() );

  private _polygonCoords: Coordinate[] = [];

  inputErrors( field: string ) {
    return this.contractFormOne.get(field)?.errors ?? null;
  }
  inputErrorsTwo( field: string ) {
    return this.contractFormTwo.get(field)?.errors ?? null;
  }
  inputErrorsThree( field: string ) {
    return this.contractFormThree.get(field)?.errors ?? null;
  }

  get formErrors() { return this.contractFormOne.errors; }
  get formErrorsTwo() { return this.contractFormTwo.errors; }
  get formErrorsThree() { return this.contractFormThree.errors; }

  get invalidFormOne() { return this.contractFormOne.invalid; }
  get invalidFormTwo() { return this.contractFormTwo.invalid; }
  get invalidFormThree() { return this.contractFormThree.invalid; }

  isTouched( field: string ) {
    return this.contractFormOne.get(field)?.touched ?? false;
  }
  isTouchedTwo( field: string ) {
    return this.contractFormTwo.get(field)?.touched ?? false;
  }
  isTouchedThree( field: string ) {
    return this.contractFormThree.get(field)?.touched ?? false;
  }

  get valueFormOne(): ContractFormOne { return this.contractFormOne.value; }
  get valueFormTwo(): ContractFormTwo { return this.contractFormTwo.value; }
  get valueFormThree(): ContractFormThree { return this.contractFormThree.value; }

  get lotesIdsBusied(): string[] {
    const lotesBusied = this._lotesBusied();
    return lotesBusied.reduce<string[]>( (acc, loteBusied) => {
      acc.push( loteBusied.id );
      return acc;
    }, []);
  }

  get lotesIdsSelected(): string[] {
    const lotesSelected = this._lotesSelected();
    return lotesSelected.reduce<string[]>( (acc, loteBusied) => {
      acc.push( loteBusied.id );
      return acc;
    }, []);
  }

  ngOnInit(): void {

    if( !this.paymentTypes ) throw new Error('Payments type no receibed!!!');

    this.onGetClients(  );
    this.onGetUsers();
    this.onGetProyects();
    initFlowbite();
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
      center: [ -80.6987307175805,-4.926770405375706 ], // starting position [lng, lat]
      zoom: 14, //
    });

  }

  onGetClients() {

    const pattern = this.searchClientInput.value ?? '';
    this._clientService.getClients( 1, pattern, 10 )
    .subscribe( ({ clients, total }) => {

      this._clients.set( clients );
      this.searchClientInput.reset();
    });
  }

  onGetUsers() {
    const pattern = this.searchUserInput.value ?? '';
    this._userService.getUsers( 1, pattern, 10 )
    .subscribe( ( { users } ) => {
      this._users.set( users );
      this.searchUserInput.reset();
    });
  }

  onGetProyects() {
    this._proyectService.getProyects( 1, '', 10 )
    .subscribe( ({ proyects, total }) => {

      this._proyects.set( proyects );
    });
  }

  onBuildLotes( lotes: Lote[] ) {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const lotesBusiedId = this.lotesIdsBusied;

    lotes.forEach(lote => {
      this._onBuilLotePolygon( lote, lotesBusiedId );
    });

  }

  private _onBuilLotePolygon( lote: Lote, lotesBusiedId: string[] ) {

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

    const loteIsBusied = lotesBusiedId.includes( lote.id );

    this._map.addLayer({
      'id': lote.id,
      'type': 'fill',
      'source': lote.id,
      'paint': {
        'fill-color': loteIsBusied ? 'rgba(255, 0, 0, 0.9)' : fillColor,
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

  onBuildBorderProyect() {
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

    this.onBuildLotes( this._lotes() );

  }

  onChangeClient( event: any ) {
    console.log({event});
  }

  onChangeProyect( proyectId?: string ) {

    if( !proyectId ) return;

    forkJoin({
      proyectByIdResponse: this._proyectService.getProyectById( proyectId ),
      lotesResponse: this._loteService.getLotes( proyectId, 1, '', 500 ),
      contractLotesBusied: this._contractService.getContractsByProyect( proyectId ),
    }).subscribe( ( { proyectByIdResponse, lotesResponse, contractLotesBusied } ) => {

      // console.log({contractLotesBusied});

      this._lotesBusied.set([]);
      this._lotesSelected.set([]);

      contractLotesBusied.forEach(({ lotes }) => {

        this._lotesBusied.update( (lotesBusied) => {
          return [ ...lotes, ...lotesBusied];
        });
      });

      const { polygonCoords, centerCoords, flatImage } = proyectByIdResponse;
      const { lotes } = lotesResponse;

      this._lotes.set( lotes );
      this._polygonCoords = polygonCoords;

      this._map?.remove();
      this.onBuildMap();

      this._map?.on('load', () => {

        this._map?.flyTo({
          zoom: 17,
          center: centerCoords
        });

        if( flatImage ) {
          this._buildFlatProyect( flatImage );
        } else {
          this.onBuildBorderProyect();
        }

        this.onListenSelecLote();
        this.onShowLotePopupInHover();
        this._buildMapInProgress.set( false );
      });

    });
  }

  private async _buildFlatProyect(  flatImage: Photo ) {

    if( !this._map ) throw new Error(`Div map container not found!!!`);
    const { urlImg } = flatImage;

    const points = this._polygonCoords.reduce<number[][]>( (acc: number[][], current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const polygonId = uuid();

    this._map.addSource( polygonId, {
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

    this._alertService.showLoading();


    this._map.loadImage( urlImg, (err, image) => {
      // Throw an error if something goes wrong.
      if (err) throw err;

      const imageId = uuid();
      // Add the image to the map style.
      this._map!.addImage(imageId, image!, {
        pixelRatio: 3,
      });


      // Create a new layer and style it using `fill-pattern`.
      this._map!.addLayer({
        'id': uuid(),
        'type': 'fill',
        'source': polygonId,
        'paint': {
            'fill-pattern': imageId,
        }
      });

      this._alertService.close();

      this.onBuildLotes( this._lotes() );

    });

  }

  onListenSelecLote() {
    if( !this._map ) throw new Error(`Map not found!!!`);

    this._map.on('click', (e) => {

      const lotesBusiedId = this.lotesIdsBusied;
      const lotesSelectedId = this.lotesIdsSelected;

      const loteIds = this._lotes().reduce<string[]>( (acc, lote) => {
        acc.push( lote.id );
        return acc;
      }, []);

      // Set `bbox` as 5px reactangle area around clicked point.
      const bbox: [PointLike, PointLike] = [
          [e.point.x - 5, e.point.y - 5],
          [e.point.x + 5, e.point.y + 5]
      ];
      // Find features intersecting the bounding box.
      const selectedFeatures = this._map!.queryRenderedFeatures( bbox, {
          layers: loteIds
      });
      const fips = selectedFeatures.map(
          (feature) => (feature.properties as Lote)
      );

      console.log({selectedFeatures, fips});
      // Set a filter matching selected features by FIPS codes
      // to activate the 'counties-highlighted' layer.


      for (const key in fips) {
        if (Object.prototype.hasOwnProperty.call(fips, key)) {
          const lote = fips[key];

          if( lotesBusiedId.includes( lote.id ) || lotesSelectedId.includes( lote.id ) ) continue;

          this._lotesSelected.update( (value) => [ lote, ...value ] );

          this._map?.setPaintProperty( lote.id , 'fill-color', '#a1dab4');
          this._map?.setPaintProperty( lote.id , 'fill-opacity', 0.5);

        }
      }

    });
  }

  onShowLotePopupInHover() {

    if( !this._map ) throw new Error(`Map not found!!!`);

    const lotes = this._lotes();
    const lotesBusiedId = this.lotesIdsBusied;

    for (const key in lotes) {
      if (Object.prototype.hasOwnProperty.call(lotes, key)) {
        const lote = lotes[key];

        const { code, squareMeters, price } = lote;
        const priceFormater = formatNumber( price, 'en-US', '.2-2' );
        const loteIsBusied = lotesBusiedId.includes( lote.id );

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

        if( loteIsBusied ) {
          popupHtml += `
            <div class="flex justify-start items-center pt-1" >
              <div class="w-4 h-4 bg-red-500 border-2 border-red-500 rounded-full dark:border-gray-900 mr-4"></div>
              <span class="text-red-600 font-semibold">
                Ocupado
              </span>
            </div>
          `;
        }

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

  onRemoveLoteSelected( lote: LoteSelectedInMap ) {
    this._lotesSelected.update( (lotes) => {
      return lotes.filter( (loteSelected) => loteSelected.id != lote.id );
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

    this._map?.setPaintProperty( lote.id , 'fill-color', fillColor);
    this._map?.setPaintProperty( lote.id , 'fill-opacity', 0.3);

  }

  onChangePaymentType( paymentType?: Nomenclature ) {

    if( !paymentType ) return;

    const { value, label } = paymentType;
    const totalLote = this._lotesAmount();

    this.contractFormThree.get('financingId')?.clearValidators();
    this.contractFormThree.get('quotaId')?.clearValidators();
    this.contractFormThree.get('initialAmount')?.clearValidators();

    // initialAmount
    if( value == PaymentType.cash ) {
      this._interestPercent.set( 0 );
      this._amountToFinancing.set( 0 );
      this.contractFormThree.get('financingId')?.setValue(null);
      this.contractFormThree.get('quotaId')?.setValue(null);
      this.contractFormThree.get('initialAmount')?.addValidators([ Validators.required, Validators.min(totalLote) ]);
    } else {
      this.contractFormThree.get('financingId')?.addValidators( [ Validators.required ] );
      this.contractFormThree.get('quotaId')?.addValidators( [ Validators.required ] );
    }

    this.contractFormThree.updateValueAndValidity();
  }

  onChangeFinancing( financing: Financing ) {
    const { quotas, initial, financingType } = financing;
    const totalLote = this._lotesAmount();


    this._quotas.set( quotas );

    let initialValueMin = initial;

    if( financingType == FinancingType.percent ) {
      initialValueMin = totalLote * ( initial / 100 );
    }

    this.contractFormThree.get('initialAmount')?.clearValidators();
    this.contractFormThree.get('initialAmount')?.addValidators([ Validators.required, Validators.min(initialValueMin) ]);

    this.contractFormThree.updateValueAndValidity();

  }

  onChangeQuota( quota: Quota ) {

    const totalLotes = this._lotesAmount();
    const { interestPercent, numberOfQuotes } = quota;

    const { initialAmount } = this.valueFormThree;

    const totalToFinancing = (totalLotes - initialAmount);
    const totalInterest = totalToFinancing * ( interestPercent / 100 );

    const totalToFinancingFinal = totalToFinancing + totalInterest;

    this._interestPercent.set( interestPercent );
    this._amountToFinancing.set( totalToFinancingFinal );
    this._amountToQuota.set( totalToFinancingFinal / numberOfQuotes )

  }

  onResetAfterSubmit( ) {
    const lotesSelected = this.lotesSelected();
    lotesSelected.forEach( lote => this.onRemoveLoteSelected(lote) );

    this.contractFormOne.reset();
    this.contractFormTwo.reset();
    this.contractFormThree.reset();

    this.stepper?.reset();
  }

  onSubmit() {

    if( this.invalidFormOne || this.invalidFormTwo || this.invalidFormThree ) return;

    const body1 = this.valueFormOne;
    const body2 = this.valueFormTwo;
    const body3 = this.valueFormThree;

    this._alertService.showLoading();

    this._contractService.createContract( { ...body1, ...body2, ...body3 } )
    .subscribe( (contractCreated) => {

      this._alertService.showAlert( 'Contrato creado exitosamente', undefined, 'success' );

      this.onCreated.emit( contractCreated );
      this.btnCloseContractModal?.nativeElement.click();
    });

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

  onNextFinancingStep() {

    const lotes = this._lotesSelected();

    const loteIds = lotes.reduce<string[]>( (acc, lote) => {
      acc.push( lote.id );
      return acc;
    }, []);

    this.contractFormTwo.get('loteIds')?.setValue( loteIds );

    if( this.invalidFormTwo ) {

      this.contractFormTwo.markAllAsTouched();
      return ;
    }

    this.stepper?.next();
    this.onGetFinancingByProyect();


    let totalLotes = 0;
    lotes.forEach((lote) => {
      totalLotes += lote.price;
    });

    this._lotesAmount.set( totalLotes );

  }

  onGetFinancingByProyect() {

    const { proyectId } = this.valueFormTwo;

    this._financingService.getFinancings( proyectId, 1, '', 10 )
    .subscribe( ( { financings, total } ) => {
      this._financings.set( financings );
    });

  }

  ngOnDestroy(): void {

  }

}
