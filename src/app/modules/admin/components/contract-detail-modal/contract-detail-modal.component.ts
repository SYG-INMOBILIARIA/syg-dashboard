import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, computed, forwardRef, inject, signal } from '@angular/core';
import { ContractDetailModalModule } from './contract-detail-modal.module';
import { AlertService } from '@shared/services/alert.service';
import { ContractService } from '../../services/contract.service';
import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CustomStepper } from '@shared/components/custom-stepper/custom-stepper.component';
import { ContractByID, Schedule } from '../../interfaces';
import { Map, Popup } from 'mapbox-gl';
import { PaymentType } from '../../enum';
import { forkJoin } from 'rxjs';

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


  public contractById = computed( () => this._contractById() );
  public client = computed( () => this._contractById()?.client );
  public lotes = computed( () => this._contractById()?.lotes );

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
  }

  onLoadContract() {

    if( !this._contractId ) throw new Error('Not recibed contractId');

    this._alertService.showLoading();

    this._contractService.getContractById( this._contractId )
    .subscribe( ( contractById ) => {

      this._contractById.set( contractById );

      this._alertService.close();

    });

  }

  onMapInterective( index: number ) {

    console.log('onMapInterective');
    if( index == 1 ) {
      setTimeout(() => {
        this._map?.resize();
      }, 50);
    }
  }


  onReset() {

  }

  ngOnDestroy(): void {
    this._map?.remove();
  }


}
