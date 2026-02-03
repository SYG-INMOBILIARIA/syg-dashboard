import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import ApexCharts from 'apexcharts';

import { DashboardService } from '@app/dashboard/services/dashboard.service';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'visitor-counter-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './visitor-counter-card.component.html',
  styles: ``
})
export class VisitorCounterCardComponent implements OnInit {

  private readonly _dasboardService = inject( DashboardService );

  private _visitorYears = signal<number[]>( [] );
  private _dataInProgress = signal<boolean>( false );

  public visitorYears = computed( () => this._visitorYears() );
  public dataInProgress = computed( () => this._dataInProgress() );

  public yearInput = new FormControl( 0, [ Validators.required ]);

  private chartOptions = {
    series: [{
      data: [400, 430,]
    }],
      chart: {
      type: 'bar',
      height: 350
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        borderRadiusApplication: 'end',
        horizontal: true,
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + ` visitante${ val > 1 ? 's' : '' }`;
        }
      }
    },
    xaxis: {
      categories: ['South Korea', 'Canada'],
    }
  };

  ngOnInit(): void {
    this.getVisitorYears();
  }

  getVisitorYears() {

    this._dataInProgress.set( true );

    this._dasboardService.getVisitorYears()
    .then( (years) => {

      if( !years || years.length === 0 ) {
        this._visitorYears.set( [ new Date().getFullYear() ] );
        this._getVisitorByYear( new Date().getFullYear() );
        this.yearInput.setValue( new Date().getFullYear() );
        return;
      }

      this._visitorYears.set( years );
      this._getVisitorByYear( years[0] );
      this.yearInput.setValue( years[0] );

    }).catch( (error) => {
      console.error('Error fetching visitor years:', error);
    } );
  }

  private _getVisitorByYear( year: number ) {

    this._dasboardService.getCountVisitorByYear( year )
    .subscribe( (data) => {

      this._dataInProgress.set( false );

      if (document.getElementById("visitors-chart") && typeof ApexCharts !== 'undefined') {

        document.getElementById("visitors-chart")!.innerHTML = '';

        const chart = new ApexCharts(document.getElementById("visitors-chart"), {
          ...this.chartOptions,
          series: [
            {
              name: 'Total',
              data: data.totals
            }
          ],
          // labels: data.map(d => d.month)
          xaxis: {
            categories: data.months,
          }
        });

        chart.render();

      }

    });

  }

  public getVisitorByYear( arguement: any ) {
    this._dataInProgress.set( true );
    this._getVisitorByYear( Number( arguement.value ) );
  }

}
