import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, UntypedFormBuilder, ɵInternalFormsSharedModule, ReactiveFormsModule } from '@angular/forms';
import { TopSeller } from '@app/dashboard/interfaces';
import { DashboardService } from '@app/dashboard/services/dashboard.service';
import { FlatpickrDefaultsInterface, FlatpickrDirective } from 'angularx-flatpickr';
import moment from 'moment';

@Component({
  selector: 'top-sellers',
  standalone: true,
  imports: [
    CommonModule,
    FlatpickrDirective,
    ɵInternalFormsSharedModule,
    ReactiveFormsModule
],
  templateUrl: './top-sellers.component.html',
  styles: ``
})
export class TopSellersComponent implements OnInit {

  private _dashboardService = inject( DashboardService );

  public flatpickrOptionsRange: FlatpickrDefaultsInterface = {
    clickOpens: true,
    maxDate: moment( new Date() ).endOf('month').toDate(),
    mode: 'range',
  };

  private _topSellers = signal<TopSeller[]>( [] );
  private _listInProgress = signal<boolean>( false );

  public topSellers = computed( () => this._topSellers() );
  public listInProgress = computed( () => this._listInProgress() );

  private _rangeDateLabelText = '';

  get rangeDateLabelText() { return this._rangeDateLabelText; };

  private _fb = inject( UntypedFormBuilder );

  public pickerForm = this._fb.group({
    range: [ null ]
  });

  ngOnInit(): void {

    this.onGetTopsellers();
    this.onListenChangeRange();

  }

  onGetTopsellers( dateFrom?: string, dateTo?: string ) {

    this._listInProgress.set( true );

    this._dashboardService.getTopSellers( dateFrom, dateTo )
    .subscribe( ( { startDate, endDate, sellers } ) => {

      this._topSellers.set( sellers );
      this._rangeDateLabelText = `${ moment( startDate ).format('DD [de] MMMM YYYY') } a ${ moment( endDate ).format('DD [de] MMMM YYYY') }`;
      this._listInProgress.set( false );

    } );
  }

  onListenChangeRange() {

    this.pickerForm.get('range')?.valueChanges
    .subscribe( (value: string) => {

      console.log('cambio el rango ::: ', value);

      const [from, to] = String(value).split(' a ');

      if( !from || !to ) return;

      this.onGetTopsellers( from, to );

    } );

  }

}
