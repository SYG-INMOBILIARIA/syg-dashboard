import { CommonModule } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { forkJoin, Subscription } from 'rxjs';
import { initFlowbite } from 'flowbite';
import { LngLatLike, Map, Popup } from 'mapbox-gl';
import { validate as ISUUID } from 'uuid';

import { AppState } from '@app/app.config';
import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { WebUrlPermissionMethods } from '@app/auth/interfaces';
import { AlertService } from '@shared/services/alert.service';
import { fullTextPatt, numberPatt } from '@shared/helpers/regex.helper';
import { ReservationService } from '@modules/admin/services/reservation.service';
import { apiReservation } from '@shared/helpers/web-apis.helper';
import { ContractByReservationBody, IReservationBody, Reservation } from './interfaces';
import { NgSelectModule } from '@ng-select/ng-select';
import { ClientService } from '@modules/admin/services/client.service';
import { Client, Coordinate, Financing, Lote, LoteSelectedInMap, Proyect, Quota } from '@modules/admin/interfaces';
import { ProyectService } from '@modules/admin/services/proyect.service';
import { LoteService } from '@modules/admin/services/lote.service';
import { MzByProyect } from '../lotes-by-proyect/interfaces';
import { Nomenclature, Photo } from '@shared/interfaces';
import { FinancingType, LoteStatus, PaymentType } from '@modules/admin/enum';
import { UserService } from '@modules/security/services/user.service';
import { User } from '@modules/security/interfaces';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { FlatpickrDefaultsInterface, FlatpickrDirective } from 'angularx-flatpickr';
import { FinancingService } from '@modules/admin/services/financing.service';
import { ContractService } from '@modules/admin/services/contract.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    PipesModule,
    InputErrorsDirective,
    SpinnerComponent,
    NgSelectModule,
    FlatpickrDirective
  ],
  templateUrl: './reservation.component.html',
})
export default class ReservationComponent implements OnInit {

  //redux
  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnCloseReservationModal') btnCloseReservationModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowReservationModal') btnShowReservationModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowContractByReservation') btnShowContractByReservation!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnCloseContractByReservationModal') btnCloseContractByReservationModal!: ElementRef<HTMLButtonElement>;

  @ViewChild('map') mapContainer?: ElementRef<HTMLDivElement>;
  private _map?: Map;
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

  private _alertService = inject( AlertService );
  private _reservationService = inject( ReservationService );
  private _clientService = inject( ClientService );
  private _proyectService = inject( ProyectService );
  private _loteService = inject( LoteService );
  private _userService = inject( UserService );
  private _nomenclatureService = inject( NomenclatureService );
  private _financingService = inject( FinancingService );
  private _contractService = inject( ContractService );

  private _formBuilder = inject( UntypedFormBuilder );

  public reservationForm = this._formBuilder.group({
    id:              [ null, [] ],
    clientIds:       [ [], [ Validators.required, Validators.minLength(1) ] ],
    loteIds:         [ [], [ Validators.required, Validators.minLength(1) ] ],
    proyectId:       [ null, [ ] ],
    observation:     [ null, [ Validators.pattern( fullTextPatt ) ] ],
  });

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public searchClientInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public searchMzInput = new FormControl( null, [ ]);

  public modalTitle = 'Crear nueva reserva';

  private _isLoading = signal( true );
  private _loadingClients = signal( false );
  private _loadingLotes = signal( false );
  private _buildMapInProgress = signal( false );
  private _isSaving = signal( false );
  private _allowList = signal( true );
  private _totalReservations = signal( 0 );
  private _reservations = signal<Reservation[]>( [] );
  private _clients = signal<Client[]>( [] );
  private _proyects = signal<Proyect[]>( [] );
  private _lotes = signal<Lote[]>( [] );
  private _lotesSelected = signal<Lote[]>( [] );
  private _mzList = signal<MzByProyect[]>( [] );

  public isLoading = computed( () => this._isLoading() );
  public loadingClients = computed( () => this._loadingClients() );
  public loadingLotes = computed( () => this._loadingLotes() );
  public buildMapInProgress = computed( () => this._buildMapInProgress() );
  public isSaving = computed( () => this._isSaving() );
  public allowList = computed( () => this._allowList() );
  public totalReservations = computed( () => this._totalReservations() );
  public reservations = computed( () => this._reservations() );
  public clients = computed( () => this._clients() );
  public proyects = computed( () => this._proyects() );
  public lotes = computed( () => this._lotes() );
  public lotesSelected = computed( () => this._lotesSelected() );
  public mzList = computed( () => this._mzList() );

  private _polygonCoords: Coordinate[] = [];

  get isInvalidSearchInput() { return this.searchInput.invalid; }
  get isInvalidForm() { return this.reservationForm.invalid; }

  get lotesIdsSelected(): string[] {
    const lotesSelected = this._lotesSelected();
    return lotesSelected.reduce<string[]>( (acc, loteBusied) => {
      acc.push( loteBusied.id );
      return acc;
    }, []);
  }

  get reservationBody(): IReservationBody {
    return this.reservationForm.value;
  }

  inputErrors( field: string ) {
    return this.reservationForm.get(field)?.errors ?? null;
  }

  isTouched( field: string ) {
    return this.reservationForm.get(field)?.touched ?? false;
  }

  // propiedades para contratos

  public readonly maxDate = new Date();

  public searchUserInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public contractForm = this._formBuilder.group({
    reservationId:      [ null, [] ],
    clientIds:          [ null, [ Validators.required, Validators.minLength(1), Validators.maxLength(5) ] ],
    documentation:      [ '',   [ ] ],
    observation:        [ '',   [ ] ],
    selledUserId:       [ null, [ Validators.required ] ],
    percentCommission:  [ 0,    [ Validators.required, Validators.min(1), Validators.max(30) ] ],
    proyectId:          [ null, [ Validators.required ] ],
    loteIds:            [ [ ],   [ Validators.required, Validators.minLength(1), Validators.maxLength(100) ] ],

    paymentType:        [ null, [ Validators.required ] ],
    financingId:        [ null, [ ] ],
    quotaId:            [ null, [ ] ],
    initialAmount:      [ null, [ Validators.required, Validators.min(5000) ] ],

    numberOfQuotesPaid: [ 0, [ Validators.required, Validators.min(0), Validators.pattern( numberPatt ) ] ],
    contractDate:       [ null, [ ] ],
    firstPayDate:       [ null, [ ] ],
  });

  private _lotesAmount = signal<number>( 0 );
  private _interestPercent = signal<number>( 0 );
  private _amountToFinancing = signal<number>( 0 );
  private _amountToQuota = signal<number>( 0 );
  private _amountPaid = signal<number>( 0 );
  private _amountPaidPending = signal<number>( 0 );
  private _countQuotesPending = signal<number>( 0 );
  private _contractInSaving = signal<boolean>( false );
  private _initialAmoutDisabled = signal( false );
  private _users = signal<User[]>( [] );
  private _financings = signal<Financing[]>( [] );
  private _quotas = signal<Quota[]>( [] );
  private _paymentTypes = signal<Nomenclature[]>( [] );
  private _lotesForContract = signal<Lote[]>( [] );

  public lotesAmount = computed( () => this._lotesAmount() );
  public interestPercent = computed( () => this._interestPercent() );
  public amountToFinancing = computed( () => this._amountToFinancing() );
  public amountToQuota = computed( () => this._amountToQuota() );
  public amountPaid = computed( () => this._amountPaid() );
  public amountPaidPending = computed( () => this._amountPaidPending() );
  public countQuotesPending = computed( () => this._countQuotesPending() );
  public contractInSaving = computed( () => this._contractInSaving() );
  public initialAmoutDisabled = computed( () => this._initialAmoutDisabled() );
  public users = computed( () => this._users() );
  public paymentTypes = computed( () => this._paymentTypes() );
  public financings = computed( () => this._financings() );
  public quotas = computed( () => this._quotas() );
  public lotesForContract = computed( () => this._lotesForContract() );

  private _financingQuota: Quota | null = null;

  get contractBody(): ContractByReservationBody {
    return this.contractForm.value;
  }

  get numberOfQuotesPaid() { return this.contractForm.get('numberOfQuotesPaid')?.value ?? 0; }

  get paymentTypeIsCash() {
    const paymentType = this.contractForm.get('paymentType')?.value;
    return paymentType == PaymentType.cash;
  }

  get isInvalidContractForm() { return this.contractForm.invalid; }

  inputContractErrors( field: string ) {
    return this.contractForm.get(field)?.errors ?? null;
  }

  isContractTouched( field: string ) {
    return this.contractForm.get(field)?.touched ?? false;
  }

  constructor() {
    effect( () => {

      const lotesIds = this.lotesIdsSelected;
      this.reservationForm.get('loteIds')?.setValue( lotesIds );

    } )
  }

  ngOnInit(): void {

    initFlowbite();
    this.onListenAuthRx();
    this.onGetReservations();
    this.onSearchClients();
    this.onGetProyects();
    this.onGetUsers();
    this.onGetNomenclatures();
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

  onResizeMap() {
    setTimeout(() => {
      this._map?.resize();
    }, 250);
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
            // 'IN_PROGRESS','#6b7280', //! Borrar después
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

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetReservations( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiReservation && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._reservationService.getReservations( page, filter )
    .subscribe({
      next: ({ reservations, total }) => {

        this._totalReservations.set( total );
        this._reservations.set( reservations );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
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

  onGetProyects() {
    this._proyectService.getProyects( 1, '', 900 )
    .subscribe( ({  proyects }) => {

      this._proyects.set( proyects );

    } );
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

      this.lotesSelected().map( (lote) => {
        this._map!.setFeatureState({ source: this.SOURCE_ID, id: lote.id }, { selectedForSale: false });
      });

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

    const { proyectId } = this.reservationBody;

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

  onResetAfterSubmit() {
    this.modalTitle = 'Crear nueva reserva';
    this.reservationForm.reset();
    this._isSaving.set( false );
    this._lotesSelected.set([]);
  }

  onLoadToUpdate( reservation: Reservation ) {

    if( reservation.contract ) {
      this._alertService.showAlert(`Esta reserva está asociada al contrato #${ reservation.contract.code }, no puede editarlo`, undefined, 'warning');
      return;
    }

    this._alertService.showLoading();

    this._reservationService.getReservationById( reservation.id )
    .subscribe({
      next: (expenseById) => {

        const { createAt, isActive, userCreate, lotes, clients, proyect, ...rest } = expenseById;

        this.reservationForm.reset({
          ...rest,
          clientIds:     clients.map( (client) => client.id ),
          loteIds:       lotes.map( (lote) => lote.id ),
          proyectId:     proyect.id,
        });

        this.onChangeProyect( proyect );

        setTimeout(() => {
          this._lotesSelected.set( lotes );
        }, 1000);

        this.btnShowReservationModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    });

  }

  async onRemoveConfirm( reservation: Reservation ) {

    if( reservation.contract ) {
      this._alertService.showAlert(`Esta reserva está asociada al contrato #${ reservation.contract.code }, no puede eliminarlo`, undefined, 'warning');
      return;
    }

    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar reserva #"${ reservation.code }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._removeexpense( reservation.id );
    }
  }

  private _removeexpense( reservationId: string ) {

    const allowDelete = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiReservation && permission.methods.includes( 'DELETE' )
    );

    if( !allowDelete ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para eliminar una reserva', 'warning');
      return;
    }

    this._alertService.showLoading();

    this._reservationService.removeReservation( reservationId )
    .subscribe({
      next: (reservationDeleted) => {
        this.onGetReservations();
        this._alertService.showAlert(`Reserva #${ reservationDeleted.code } eliminada exitosamente`, undefined, 'success');

      }, error: (err) => {
        this._alertService.close();
      }
    });

  }

  onSubmit() {

    if( this.isInvalidForm || this._isSaving() ) return;

    const allowCreate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiReservation && permission.methods.includes( 'POST' )
    );

    if( !allowCreate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para crear una reserva', 'warning');
      return;
    }

    const { id = 'xD', ...body } = this.reservationBody;

    this._alertService.showLoading();

    if( !ISUUID( id ) ) {

      this._reservationService.createReservation( body )
      .subscribe({
        next: ( { code } ) => {

          this._alertService.showAlert( `Reserva #${code} creado exitosamente`, undefined, 'success' );
          this.onResetAfterSubmit();
          this.onGetReservations();
          this.btnCloseReservationModal.nativeElement.click();

        }, error: (err) => {
          this._isSaving.set( false );
        }
      });

      return;
    }

    this._reservationService.updateReservation( id, body )
      .subscribe({
        next: ( { code } ) => {

          this._alertService.showAlert( `Reserva #${code} actualiada exitosamente`, undefined, 'success' );
          this.onResetAfterSubmit();
          this.onGetReservations();
          this.btnCloseReservationModal.nativeElement.click();

        }, error: (err) => {
          this._isSaving.set( false );
        }
      });


  }

  // funciones para crear contratos

  onGetUsers() {
    const pattern = this.searchUserInput.value ?? '';
    this._userService.getUsers( 1, pattern, 10 )
    .subscribe( ( { users } ) => {
      this._users.set( users );
      this.searchUserInput.reset();
    });
  }

  onGetNomenclatures() {
    this._nomenclatureService.getPaymentType()
    .subscribe( ({ nomenclatures }) => {
      this._paymentTypes.set( nomenclatures );
    } );

  }

  onChangePaymentType( paymentType?: Nomenclature ) {

    if( !paymentType ) return;

    const { value } = paymentType;
    const totalLote = this._lotesAmount();
    // const { numberOfQuotesPaid } = this.valueFormThree;

    this.contractForm.get('financingId')?.clearValidators();
    this.contractForm.get('quotaId')?.clearValidators();
    this.contractForm.get('initialAmount')?.clearValidators();
    this.contractForm.get('numberOfQuotesPaid')?.clearValidators();

    // initialAmount
    if( value == PaymentType.cash ) {

      this.contractForm.get('financingId')?.setValue(null);
      this.contractForm.get('quotaId')?.setValue(null);
      this.contractForm.get('initialAmount')?.addValidators([ Validators.required, Validators.min(totalLote) ]);
      this.contractForm.get('numberOfQuotesPaid')?.addValidators([ Validators.required, Validators.pattern( numberPatt ), Validators.min(0), Validators.max(1) ]);
      this.contractForm.get('initialAmount')?.setValue( totalLote );
      this._initialAmoutDisabled.set( true );

    } else {
      this.contractForm.get('numberOfQuotesPaid')?.addValidators([ Validators.required, Validators.pattern( numberPatt ), Validators.min(0) ]);
      this.contractForm.get('financingId')?.addValidators( [ Validators.required ] );
      this.contractForm.get('quotaId')?.addValidators( [ Validators.required ] );
      this._initialAmoutDisabled.set( false );
      this.contractForm.get('initialAmount')?.setValue( 0 );
    }

    this.contractForm.get('financingId')?.updateValueAndValidity();
    this.contractForm.get('quotaId')?.updateValueAndValidity();
    this.contractForm.get('initialAmount')?.updateValueAndValidity();
    this.contractForm.get('numberOfQuotesPaid')?.updateValueAndValidity();

    this.onCalculateAmountTotals();

  }

  onCalculateAmountTotals() {

  const totalLotes = this._lotesAmount();
  const { initialAmount, numberOfQuotesPaid, paymentType } = this.contractBody;

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
    ];

    if( financingType == FinancingType.percent ) {
      initialValueMin = totalLote * ( initial / 100 );
    }

    if( this._financingQuota ) {
      numberOfQuotesValidators.push( Validators.max( this._financingQuota.numberOfQuotes )  );
    }

    this.contractForm.get('initialAmount')?.clearValidators();
    this.contractForm.get('numberOfQuotesPaid')?.clearValidators();

    this.contractForm.get('initialAmount')?.addValidators([ Validators.required, Validators.min(initialValueMin) ]);
    this.contractForm.get('numberOfQuotesPaid')?.addValidators( numberOfQuotesValidators );

    this.contractForm.get('initialAmount')?.updateValueAndValidity();
    this.contractForm.get('numberOfQuotesPaid')?.updateValueAndValidity();

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

    this.contractForm.get('numberOfQuotesPaid')?.clearValidators();
    this.contractForm.get('numberOfQuotesPaid')?.addValidators( numberOfQuotesValidators );
    this.contractForm.get('numberOfQuotesPaid')?.updateValueAndValidity();

    this.onCalculateAmountTotals();
  }

  onGetFinancingByProyect() {

    const { proyectId } = this.contractBody;

    this._financingService.getFinancings( proyectId, 1, '', 10 )
    .subscribe( ( { financings } ) => {
      this._financings.set( financings );
    });

  }

  onLoadContractByReservation( reservation: Reservation ) {

    this._alertService.showLoading();

    this._reservationService.getReservationById( reservation.id )
    .subscribe({
      next: (expenseById) => {

        const { lotes, clients, proyect } = expenseById;

        this.contractForm.reset({
          clientIds: clients.map( (client) => client.id ),
          loteIds: lotes.map( (lote) => lote.id ),
          proyectId: proyect.id,
          reservationId: reservation.id
        });

        this._lotesForContract.set( lotes );

        let totalLotes = 0;
        lotes.forEach((lote) => {
          totalLotes += lote.price;
        });

        this._lotesAmount.set( totalLotes );
        this.onGetFinancingByProyect();

        this.btnShowContractByReservation.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    });

  }

  onResetAfterSubmitContract() {
    this.contractForm.reset();
  }

  onSubmitContract() {

    this._contractInSaving.set( true );

    this._contractService.createContract( this.contractBody )
    .subscribe({
      next: (contractCreated) => {

        this._alertService.showAlert( `Contrato #${contractCreated.code} creado exitosamente`, undefined, 'success' );
        this.btnCloseContractByReservationModal.nativeElement.click();

        this.onGetReservations();

        this._contractInSaving.set( false );
      }, error: (err) => {
        this._contractInSaving.set( false );
      }
    });

  }

}
