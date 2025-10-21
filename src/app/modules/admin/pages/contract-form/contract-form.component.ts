import { AfterViewInit
  , Component
  , ElementRef
  , OnDestroy
  , OnInit
  , ViewChild
  , computed
  , forwardRef
  , inject
  , signal
} from '@angular/core';
import { Router } from '@angular/router';
import { ContractFormModule } from './contract-form.module';
import { CustomStepper } from '@shared/components/custom-stepper/custom-stepper.component';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { Nomenclature, Photo } from '@shared/interfaces';
import { LngLatLike, Map, Popup } from 'mapbox-gl';
import { initFlowbite } from 'flowbite';
import { forkJoin } from 'rxjs';

import { FormControl, UntypedFormBuilder, Validators } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { ProyectService } from '../../services/proyect.service';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import {
  Client
  , ContractFormOne
  , ContractFormThree
  , ContractFormTwo
  , Coordinate
  , Financing
  , Lote
  , LoteSelectedInMap
  , Proyect
  , Quota
} from '../../interfaces';
import { LoteService } from '../../services/lote.service';
import { ContractService } from '../../services/contract.service';
import { FinancingService } from '../../services/financing.service';
import { UserService } from '../../../security/services/user.service';
import { AlertService } from '@shared/services/alert.service';
import { descriptionPatt, fullTextPatt, numberPatt } from '@shared/helpers/regex.helper';
import { User } from '../../../security/interfaces';
import { FinancingType, LoteStatus, PaymentType } from '../../enum';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { MzByProyect } from '../lotes-by-proyect/interfaces';

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [
    ContractFormModule,
    forwardRef(() => CustomStepper ),
    CdkStepperModule
  ],
  templateUrl: './contract-form.component.html',
  styles: `
    #map {
      width: 100%;
      height: 500px;
      margin: 0px;
      /* background-color: blueviolet; */
    }
  `
})
export default class ContractFormComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('myStepper') stepper?: CdkStepper;

  private _map?: Map;
  public readonly maxDate = new Date();

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

  private _router = inject( Router );
  private _formBuilder = inject( UntypedFormBuilder );
  private _clientService = inject( ClientService );
  private _proyectService = inject( ProyectService );
  private _loteService = inject( LoteService );
  private _contractService = inject( ContractService );
  private _financingService = inject( FinancingService );
  private _userService = inject( UserService );
  private _alertService = inject( AlertService );
  private _nomenclatureService = inject( NomenclatureService );

  public searchClientInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public searchUserInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public searchMzInput = new FormControl( null, [ ]);

  public contractFormOne = this._formBuilder.group({
    clientIds:     [ null, [ Validators.required, Validators.minLength(1), Validators.maxLength(5) ] ],
    documentation:     [ '',   [ Validators.maxLength(450), Validators.pattern( descriptionPatt ) ] ],
    observation:       [ '',   [ Validators.pattern( descriptionPatt ) ] ],
    selledUserId:      [ null, [ Validators.required ] ],
    percentCommission: [ 0,    [ Validators.required, Validators.min(1), Validators.max(30) ] ]
  });

  public contractFormTwo = this._formBuilder.group({
    proyectId:  [ null, [ Validators.required ] ],
    loteIds:    [ [],   [ Validators.required, Validators.minLength(1), Validators.maxLength(20) ] ],
  });

  public contractFormThree = this._formBuilder.group({
    paymentType:        [ null, [ Validators.required ] ],
    financingId:        [ null, [ ] ],
    quotaId:            [ null, [ ] ],
    initialAmount:      [ null, [ Validators.required, Validators.min(5000) ] ],

    numberOfQuotesPaid: [ 0, [ Validators.required, Validators.min(0), Validators.pattern( numberPatt ) ] ],
    contractDate:       [ null, [ ] ],
  });

  private _initialAmoutDisabled = signal( false );

  private _isSaving = signal( false );
  private _buildMapInProgress = signal( false );
  private _loadingLotes = signal<boolean>( false );

  private _clients = signal<Client[]>( [] );
  private _users = signal<User[]>( [] );
  private _proyects = signal<Proyect[]>( [] );
  private _lotes = signal<Lote[]>( [] );
  private _mzList = signal<MzByProyect[]>( [] );

  private _lotesSelected = signal<Lote[]>( [] );

  private _financings = signal<Financing[]>( [] );
  private _quotas = signal<Quota[]>( [] );
  private _paymentTypes = signal<Nomenclature[]>( [] );

  private _lotesAmount = signal<number>( 0 );
  private _interestPercent = signal<number>( 0 );
  private _amountToFinancing = signal<number>( 0 );
  private _amountToQuota = signal<number>( 0 );
  private _amountPaid = signal<number>( 0 );
  private _amountPaidPending = signal<number>( 0 );
  private _countQuotesPending = signal<number>( 0 );

  private _loadingClients = signal<boolean>( false );

  public paymentTypes = computed( () => this._paymentTypes() );
  public mzList = computed( () => this._mzList() );
  public initialAmoutDisabled = computed( () => this._initialAmoutDisabled() );
  public isSaving = computed( () => this._isSaving() );
  public buildMapInProgress = computed( () => this._buildMapInProgress() );
  public clients = computed( () => this._clients() );
  public users = computed( () => this._users() );
  public proyects = computed( () => this._proyects() );
  public lotes = computed( () => this._lotes() );
  public lotesSelected = computed( () => this._lotesSelected() );
  public financings = computed( () => this._financings() );
  public quotas = computed( () => this._quotas() );
  public lotesAmount = computed( () => this._lotesAmount() );
  public interestPercent = computed( () => this._interestPercent() );
  public amountToFinancing = computed( () => this._amountToFinancing() );
  public amountToQuota = computed( () => this._amountToQuota() );
  public amountPaid = computed( () => this._amountPaid() );
  public amountPaidPending = computed( () => this._amountPaidPending() );
  public countQuotesPending = computed( () => this._countQuotesPending() );
  public loadingLotes = computed( () => this._loadingLotes() );

  public loadingClients = computed( () => this._loadingClients() );

  private _financingQuota: Quota | null = null;

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
  get numberOfQuotesPaid() { return this.contractFormThree.get('numberOfQuotesPaid')?.value ?? 0; }


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

  get lotesIdsSelected(): string[] {
    const lotesSelected = this._lotesSelected();
    return lotesSelected.reduce<string[]>( (acc, loteBusied) => {
      acc.push( loteBusied.id );
      return acc;
    }, []);
  }

  get paymentTypeIsCash() {
    const paymentType = this.contractFormThree.get('paymentType')?.value;
    return paymentType == PaymentType.cash;
  }

  ngOnInit(): void {
    this.onLoadDataSelects();
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
      zoom: 17,
      bearing: 0,
      pitch: 0
    });

    this._map.on('load', () => {
      this._onAddMapxboxElements();
      this._onAddMapboxEvents();

      this._buildMapInProgress.set( false );
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
        // 'fill-color': '#67e8f9',


        'fill-opacity': [
          'case',
            ['boolean', ['feature-state', 'selected'], false], 0.55,
            ['boolean', ['feature-state', 'hovered'],  false], 0.45,
            0.3
        ],
        'fill-color': [
          'case',
            // Si está ocupado (busied)
            ['boolean', ['feature-state', 'busied'], false], '#E65757',

            // Si está seleccionado para venta (selectedForSale)
            ['boolean', ['feature-state', 'selectedForSale'],  false], '#78E657',

            // Si no hay estados especiales, usamos el loteStatus
            ['match', ['get', 'loteStatus'],
            'AVAILABLE', '#67e8f9',
            'SELLED',    '#31c48d',
            'RESERVED',   '#FA2D2D', //#FA2D2D -> FFDC42
            'IN_PROGRESS','#6b7280',
            /* default */ '#67e8f9'
            ]
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

      const id = f.id as string;

      if (this.hoveredId !== null && this.hoveredId !== id) {
        this._map!.setFeatureState({ source: this.SOURCE_ID, id: this.hoveredId }, { hovered: false });
      }
      this.hoveredId = id;
      this._map!.setFeatureState({ source: this.SOURCE_ID, id }, { hovered: true });
      this._map!.getCanvas().style.cursor = 'pointer';

      const lote = f.properties as Lote;
      const { mz, numberLote, squareMeters, price, loteStatus } = lote;
      let popupHtml = `
        <span class="font-extrabold text-md text-blue-500">Lote: ${mz}-${numberLote}</span>
        <p class="text-md font-semibold">
          Área: ${squareMeters} m²<br>
          Precio: <span class="font-extrabold text-md text-green-500">S/ ${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </p>`;

      let color = 'green';
      let estado = 'Vendido';

      switch (loteStatus) {
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

    this._map.on('mouseleave', this.FILL_ID, () => {
      if (this.hoveredId !== null) {
        this._map!.setFeatureState({ source: this.SOURCE_ID, id: this.hoveredId }, { hovered: false });
        this.hoveredId = null;
      }
      this._map!.getCanvas().style.cursor = '';
    });

    this._map.on('click', this.FILL_ID, (e) => {
      const f = e.features?.[0]; if (!f) return;
      const id = f.id as string;

      // quitar selección anterior
      if (this.selectedId !== null) {
        this._map!.setFeatureState({ source: this.SOURCE_ID, id: this.selectedId }, { selected: false });
      }
      this.selectedId = id;
      this._map!.setFeatureState({ source: this.SOURCE_ID, id }, { selected: true });

      const lote = f.properties as Lote;

      const lotesSelectedIds = this.lotesIdsSelected;
      const loteIsSelected = lotesSelectedIds.includes( lote.id );

      if(  !loteIsSelected && lote.loteStatus == 'AVAILABLE' ) {
        this._map!.setFeatureState({ source: this.SOURCE_ID, id }, { selectedForSale: true });
        this._lotesSelected.update( (value) => [ lote, ...value ] );
      }

    });

  }

  onSearchClients() {

    this._loadingClients.set( true );

    const pattern = this.searchClientInput.value ?? '';
    this._clientService.getClients( 1, pattern, 10, false , null, null, null )
    .subscribe( ({ clients }) => {
      this._clients.set( clients );
      this.searchClientInput.reset();
      this._loadingClients.set( false );
    });
  }

  onLoadDataSelects() {

    const pattern = this.searchUserInput.value ?? '';
    const patternClient = this.searchClientInput.value ?? '';

    this._loadingClients.set( true );

    forkJoin({
      paymentTypesResponse: this._nomenclatureService.getPaymentType(),
      usersResponse: this._userService.getUsers( 1, pattern, 10 ),
      clientsResponse: this._clientService.getClients( 1, patternClient, 10, false, null, null, null ),
      proyectsResponse: this._proyectService.getProyects( 1, '', 10 ),
    }).subscribe( ({ paymentTypesResponse, usersResponse, clientsResponse, proyectsResponse }) => {

      this._paymentTypes.set( paymentTypesResponse.nomenclatures );
      this._users.set( usersResponse.users );
      this._clients.set( clientsResponse.clients );
      this._proyects.set( proyectsResponse.proyects );

      this._loadingClients.set( false );
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

  private _onBuildLotes() {
    if( !this._map ) throw new Error(`Map not found!!!`);

    const lotes = this._lotes();

    const features = lotes.map( (lote) => ({
      type: 'Feature',
      id: lote.id, // <- clave para feature-state
      properties: { ...lote },
      geometry: {
        type: 'Polygon',
        coordinates: [ lote.polygonCoords.map(p => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]) ],
      }
    }));

    const fc = { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
    (this._map.getSource(this.SOURCE_ID) as mapboxgl.GeoJSONSource).setData(fc);

  }

  onBuildBorderProyect( polygonCoords: Coordinate[] ) {
    if( !this._map ) throw new Error(`Div map container not found!!!`);

    const points = polygonCoords.reduce<number[][]>( (acc: number[][], current) => {
      acc.push( [ current.lng, current.lat ] );
      return acc;
    }, []);

    const features = [{
      'type': 'Feature',
      'properties': {},
      'geometry': {
        'coordinates': [ points ],
        'type': 'Polygon'
      }
    }];

    const fc = { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
    (this._map!.getSource(this.FLAT_BORDER_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(fc);

  }

  onChangeProyect( proyect: Proyect ) {

    const proyectId = proyect.id;

    if( !proyectId ) return;

    this._loadingLotes.set( true );

    forkJoin({
      proyectByIdResponse: this._proyectService.getProyectById( proyectId ),
      lotesResponse: this._loteService.getLotesForMap( proyectId, 1, '', 5000 ),
      mzList: this._loteService.getLotesMz( proyectId ),
    }).subscribe( ( { proyectByIdResponse, lotesResponse, mzList } ) => {

      this._lotesSelected.set([]);

      const { polygonCoords, centerCoords, flatImage } = proyectByIdResponse;
      const { lotes } = lotesResponse;

      this._lotes.set( lotes );
      this._mzList.set( mzList );
      this._polygonCoords = polygonCoords;

      this._map?.flyTo({ zoom: 17, center: centerCoords });

      if( flatImage ) {
        this._buildFlatProyect( flatImage );
      } else {
        this.onBuildBorderProyect( polygonCoords );
      }

      this._onBuildLotes();

      this._loadingLotes.set( false );

    });
  }

  onChangeMz( mzByProject: MzByProyect ) {

    const { proyectId } = this.valueFormTwo;

    this._loadingLotes.set( true );

    this._loteService.getLotesForMap( proyectId, 1, `mz=${mzByProject?.mz ?? ''}`, 5000 )
    .subscribe( ( { lotes } ) => {

      this._lotes.set( lotes );
      this._onBuildLotes();

      if( lotes.length > 0 ) {
        this._flyToLote( lotes[0] );
      }

      this._loadingLotes.set( false );

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

  }

  private _buildFlatProyect(  flatImage: Photo ) {

    if( !this._map ) throw new Error(`Div map container not found!!!`);
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

  onRemoveLoteSelected( lote: LoteSelectedInMap ) {
    this._lotesSelected.update( (lotes) => {
      return lotes.filter( (loteSelected) => loteSelected.id != lote.id );
    });

    this._map!.setFeatureState({ source: this.SOURCE_ID, id: lote.id }, { selectedForSale: false });
  }

  onChangePaymentType( paymentType?: Nomenclature ) {

    if( !paymentType ) return;

    const { value } = paymentType;
    const totalLote = this._lotesAmount();
    // const { numberOfQuotesPaid } = this.valueFormThree;

    this.contractFormThree.get('financingId')?.clearValidators();
    this.contractFormThree.get('quotaId')?.clearValidators();
    this.contractFormThree.get('initialAmount')?.clearValidators();
    this.contractFormThree.get('numberOfQuotesPaid')?.clearValidators();

    // initialAmount
    if( value == PaymentType.cash ) {
      // this._financingQuota = null;
      // this._interestPercent.set( 0 );
      // this._amountToFinancing.set( 0 );
      this.contractFormThree.get('financingId')?.setValue(null);
      this.contractFormThree.get('quotaId')?.setValue(null);
      this.contractFormThree.get('initialAmount')?.addValidators([ Validators.required, Validators.min(totalLote) ]);
      this.contractFormThree.get('numberOfQuotesPaid')?.addValidators([ Validators.required, Validators.pattern( numberPatt ), Validators.min(0), Validators.max(1) ]);
      this.contractFormThree.get('initialAmount')?.setValue( totalLote );
      this._initialAmoutDisabled.set( true );


    } else {
      this.contractFormThree.get('numberOfQuotesPaid')?.addValidators([ Validators.required, Validators.pattern( numberPatt ), Validators.min(0) ]);
      this.contractFormThree.get('financingId')?.addValidators( [ Validators.required ] );
      this.contractFormThree.get('quotaId')?.addValidators( [ Validators.required ] );
      this._initialAmoutDisabled.set( false );
      this.contractFormThree.get('initialAmount')?.setValue( 0 );
    }

    this.contractFormThree.get('financingId')?.updateValueAndValidity();
    this.contractFormThree.get('quotaId')?.updateValueAndValidity();
    this.contractFormThree.get('initialAmount')?.updateValueAndValidity();
    this.contractFormThree.get('numberOfQuotesPaid')?.updateValueAndValidity();

    this.onCalculateAmountTotals();

  }

  onChangeFinancing( financing: Financing ) {

    if( !financing ) return;

    const { quotas, initial, financingType } = financing;
    const totalLote = this._lotesAmount();

    this._quotas.set( quotas );

    let initialValueMin = initial;
    let numberOfQuotesValidators = [
      Validators.required
      , Validators.pattern( numberPatt )
      , Validators.min(0)
      // , Validators.max( quotas.length )
    ];

    if( financingType == FinancingType.percent ) {
      initialValueMin = totalLote * ( initial / 100 );
    }

    if( this._financingQuota ) {
      numberOfQuotesValidators.push( Validators.max( this._financingQuota.numberOfQuotes )  );
    }

    this.contractFormThree.get('initialAmount')?.clearValidators();
    this.contractFormThree.get('numberOfQuotesPaid')?.clearValidators();

    this.contractFormThree.get('initialAmount')?.addValidators([ Validators.required, Validators.min(initialValueMin) ]);
    this.contractFormThree.get('numberOfQuotesPaid')?.addValidators( numberOfQuotesValidators );

    this.contractFormThree.get('initialAmount')?.updateValueAndValidity();
    this.contractFormThree.get('numberOfQuotesPaid')?.updateValueAndValidity();

  }

  onChangeQuota( quota: Quota ) {
    this._financingQuota = quota;

    let numberOfQuotesValidators = [
      Validators.required
      , Validators.pattern( numberPatt )
      , Validators.min(0)
      // , Validators.max( quotas.length )
    ];

    if( quota ) {
      numberOfQuotesValidators.push( Validators.max( quota.numberOfQuotes)  );
    }

    this.contractFormThree.get('numberOfQuotesPaid')?.clearValidators();
    this.contractFormThree.get('numberOfQuotesPaid')?.addValidators( numberOfQuotesValidators );
    this.contractFormThree.get('numberOfQuotesPaid')?.updateValueAndValidity();

    this.onCalculateAmountTotals();
  }

  onCalculateAmountTotals() {

    const totalLotes = this._lotesAmount();
    const { initialAmount, numberOfQuotesPaid, paymentType } = this.valueFormThree;

    let totalToFinancing = 0;

    if( this._financingQuota ) {

      const { interestPercent, numberOfQuotes } = this._financingQuota;

      totalToFinancing = totalLotes - initialAmount;

      const totalInterest = totalToFinancing * ( interestPercent / 100 );

      totalToFinancing += totalInterest;

      const amountQuota = totalToFinancing / numberOfQuotes;
      const amountPaid = amountQuota * numberOfQuotesPaid;

      this._interestPercent.set( interestPercent );
      this._amountToFinancing.set( totalToFinancing );
      this._amountToQuota.set( amountQuota );

      this._countQuotesPending.set( numberOfQuotes - numberOfQuotesPaid );
      this._amountPaid.set( amountPaid );
      this._amountPaidPending.set( totalToFinancing - amountPaid );

    } else if( paymentType == PaymentType.cash ) {

      totalToFinancing = totalLotes;

      const amountQuota = totalToFinancing;
      const amountPaid = amountQuota * numberOfQuotesPaid;

      this._interestPercent.set( 0 );
      this._amountToFinancing.set( totalToFinancing );
      this._amountToQuota.set( amountQuota );

      this._countQuotesPending.set( 1 - numberOfQuotesPaid );
      this._amountPaid.set( amountPaid );
      this._amountPaidPending.set( totalToFinancing - amountPaid );
    }

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

    // const allowCreate = this.webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiContract && permission.methods.includes( 'POST' )
    // );

    // if( !allowCreate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para crear un contrato', 'warning');
    //   return;
    // }

    const body1 = this.valueFormOne;
    const body2 = this.valueFormTwo;
    const body3 = this.valueFormThree;

    this._alertService.showLoading();

    this._contractService.createContract( { ...body1, ...body2, ...body3 } )
    .subscribe( (contractCreated) => {

      this._alertService.showAlert( 'Contrato creado exitosamente', undefined, 'success' );

      this._router.navigateByUrl('/dashboard/contracts');
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
    this._map?.remove();
  }
}
