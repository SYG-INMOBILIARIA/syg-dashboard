import { CommonModule, formatNumber } from '@angular/common';
import { Component, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { validate as ISUUID } from 'uuid';

import CommissionIndicatorsComponent from '../../components/commission-indicators/commission-indicators.component';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { ProfileService } from '../../services/profile.service';
import { Commission } from '../../interfaces';
import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { PaymentMethodService } from '@modules/admin/services/payment-method.service';
import { PaymentMethod } from '@modules/admin/interfaces';
import { ExcelExportService } from '@shared/services/excel-export.service';
import { MomentPipe } from '@pipes/moment.pipe';

@Component({
  selector: 'app-commission-profile',
  standalone: true,
  imports: [
    CommonModule,
    CommissionIndicatorsComponent,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    PaginationComponent
  ],
  providers: [ MomentPipe ],
  templateUrl: './commission-profile.component.html',
  styles: ``
})
export default class CommissionProfileComponent implements OnInit {

  private _profileService = inject( ProfileService );
  private _excelExportService = inject( ExcelExportService );
  private _momentPipe = inject( MomentPipe );
  private locale = inject(LOCALE_ID);

  private _paymentMethodService = inject( PaymentMethodService );
  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _isLoading = signal( true );
  private _commissions = signal<Commission[]>( [] );
  private _paymentMethod = signal<PaymentMethod[]>( [] );
  private _commissionsTotal = signal<number>( 0 );
  private _exportInProgress = signal<boolean>( false );

  public isLoading = computed( () => this._isLoading() );
  public commissions = computed( () => this._commissions() );
  public paymentMethod = computed( () => this._paymentMethod() );
  public commissionsTotal = computed( () => this._commissionsTotal() );
  public exportInProgress = computed( () => this._exportInProgress() );

  private _userSellerId = '';

  ngOnInit(): void {
    this._userSellerId = localStorage.getItem('userProfileId') ?? '';

    if( !ISUUID( this._userSellerId ) )
      throw new Error('userProfileId not found !!!');

    this.onGetPaymentTypes();
    this.onGetComissions();
  }

  onGetComissions( page = 1 ) {

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._profileService.getMyCommissions( page, filter, 5, this._userSellerId  )
    .subscribe({
      next: ({ commissions, total }) => {

        this._commissionsTotal.set( total );
        this._commissions.set( commissions );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });
  }

  onGetPaymentTypes() {

    this._paymentMethodService.getPaymentsMethod( 1, '', 100 )
    .subscribe( ({ paymentsMethod }) => {

      this._paymentMethod.set( paymentsMethod );

    });

  }

  onExportCommissionsReport() {
    // this._profileService.exportCommissionsReport( this._userSellerId );

    if( this._exportInProgress() ) return;

    this._exportInProgress.set( true );

    this._profileService.getMyCommissions( 1, '', 500, this._userSellerId  )
    .subscribe({
      next: ({ commissions, total }) => {


        const dataToExport = commissions.map( commission => ({
          'Proyecto': commission.contract.proyect.name ?? '',
          'Contrato': commission.contract.code ?? '',
          'Lote(s)': commission.contract?.lotes?.map( (lote) => lote.code ).join(', ') ?? '',
          'Fecha de cierre': this._momentPipe.transform( commission.contract.createAt, 'createAt' ),
          'Monto de venta': formatNumber( commission.contract.loteAmount ?? 0, this.locale, '.2-2' ),
          '% comisión': commission.percent ?? '',
          'Monto de comisión': formatNumber( commission.amount ?? 0, this.locale, '.2-2' ),
          'Fecha de creación': this._momentPipe.transform( commission.createAt, 'createAt' ),
        }) );

        this._excelExportService.exportToExcel( dataToExport, `comisiones` );

        this._exportInProgress.set( false );

      }, error: (err) => {
        this._exportInProgress.set( false );
      }
    });


  }

}
