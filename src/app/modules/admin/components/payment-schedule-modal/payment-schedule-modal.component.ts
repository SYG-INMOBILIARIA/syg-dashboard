import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { Client, Contract, Lote, ContractQuote } from '@modules/admin/interfaces';
import { ContractService } from '@modules/admin/services/contract.service';
import { PipesModule } from '@pipes/pipes.module';

@Component({
  selector: 'payment-schedule-modal',
  standalone: true,
  imports: [
    CommonModule,
    PipesModule
  ],
  templateUrl: './payment-schedule-modal.component.html',
  styles: ``
})
export class PaymentScheduleModalComponent implements OnInit {

  private _contractService = inject( ContractService );

  @Input({ required: true }) set contractById( contract: Contract | null ) {
    this._contract.set( contract );
    this._client.set( contract?.client ?? null );
  }

  @Input({ required: true }) set lotesByContract( lotes: Lote[] ) {
    this._lotes.set( lotes );
  }

  @Input({ required: true }) set contractQuotes( schedule: ContractQuote[] ) {
    this._contractQuotes.set( schedule );
  }

  private _downloadInProgress = signal<boolean>( false );
  private _contract = signal<Contract | null>( null );
  private _client = signal<Client | null>( null );
  private _lotes = signal<Lote[]>( [] );
  private _contractQuotes = signal<ContractQuote[]>( [] );

  public downloadInProgress = computed( () => this._downloadInProgress() );
  public contract = computed( () => this._contract() );
  public client = computed( () => this._client() );
  public lotes = computed( () => this._lotes() );
  public contractSchedule = computed( () => this._contractQuotes() );

  get lotesAmount() {
    return this.contract()?.loteAmount ?? 0;
  }

  get interestPercent() {
    return this.contract()?.interestPercent ?? 0;
  }

  get amountToFinancing() {
    return this.contract()?.amountToFinancing ?? 0;
  }

  get amountToQuota() {
    return this.contract()?.quotesAmount ?? 0;
  }

  get numberOfQuotes() {
    return this.contract()?.numberOfQuotes ?? 0;
  }

  ngOnInit(): void {

  }

  async onDonwloadSchedule() {

    if( this.downloadInProgress() ) return;

    this._downloadInProgress.set( true );
    await this._contractService.getDowlandPaymentSchedule('scheduleContractdiv');
    this._downloadInProgress.set( false);
  }

}
