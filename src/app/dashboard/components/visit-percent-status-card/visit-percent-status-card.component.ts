import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import ApexCharts from 'apexcharts';

import { DashboardService } from '@app/dashboard/services/dashboard.service';
import { VisitStatusPipe } from '@pipes/visit-status.pipe';
import { ContractDetailModalModule } from "@modules/admin/components/contract-detail-modal/contract-detail-modal.module";
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'visit-percent-status-card',
  standalone: true,
  imports: [
    CommonModule,
    ContractDetailModalModule
],
  providers: [
    VisitStatusPipe
  ],
  templateUrl: './visit-percent-status-card.component.html',
  styles: ``
})
export class VisitPercentStatusCardComponent implements OnInit {

  private readonly _dasboardService = inject( DashboardService );
  private readonly _visitStatusPipe = inject( VisitStatusPipe );

  private _visitorYears = signal<number[]>( [] );
  private _dataInProgress = signal<boolean>( false );

  public visitorYears = computed( () => this._visitorYears() );
  public dataInProgress = computed( () => this._dataInProgress() );

  public yearInput = new FormControl( 0, [ Validators.required ]);

  private chartOptions = {
    series: [{
      name: 'Marine Sprite',
      data: [44, 55, 41, 37, 22, 43, 21]
    }, {
      name: 'Striking Calf',
      data: [53, 32, 33, 52, 13, 43, 32]
    }, {
      name: 'Tank Picture',
      data: [12, 17, 11, 9, 15, 11, 20]
    }, {
      name: 'Bucket Slope',
      data: [9, 7, 5, 8, 6, 9, 4]
    }, {
      name: 'Reborn Kid',
      data: [25, 12, 19, 32, 25, 24, 10]
    }],
    chart: {
      type: 'bar',
      height: 350,
      stacked: true,
    },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: {
          total: {
            enabled: true,
            offsetX: 0,
            style: {
              fontSize: '13px',
              fontWeight: 900
            }
          }
        }
      },
    },
    stroke: {
      width: 1,
      colors: ['#fff']
    },
    // title: {
    //   text: 'Visitas por estado'
    // },
    xaxis: {
      categories: [2008, 2009, 2010, 2011, 2012, 2013, 2014],
      labels: {
        formatter: function (val: any) {
          return val;
        }
      }
    },
    yaxis: {
      title: {
        text: undefined
      },
    },
    tooltip: {
      y: {
        formatter: function (val: any) {
          return val;
        }
      }
    },
    fill: {
      opacity: 1
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      offsetX: 40
    }
  };

  ngOnInit(): void {
    this.getVisitYears();
  }

  getVisitYears() {

    this._dataInProgress.set( true );

    this._dasboardService.getVisitsYears()
    .then( (years) => {

      if( !years || years.length === 0 ) {
        this._visitorYears.set( [ new Date().getFullYear() ] );
        this._getVisitsStatusByYear( new Date().getFullYear() );
        this.yearInput.setValue( new Date().getFullYear() );
        return;
      }

      this._visitorYears.set( years );
      this._getVisitsStatusByYear( years[0] );
      this.yearInput.setValue( years[0] );

    }).catch( (error) => {
      console.error('Error fetching visitor years:', error);
    } );
  }

  private _getVisitsStatusByYear( year: number ) {

    this._dasboardService.getVisitsStatus( year )
    .subscribe( (data) => {

      this._dataInProgress.set( false );

      if (document.getElementById("visit-status-chart") && typeof ApexCharts !== 'undefined') {

        document.getElementById("visit-status-chart")!.innerHTML = '';

        const chart = new ApexCharts(document.getElementById("visit-status-chart"), {
          ...this.chartOptions,
          series: data.series.map(d => ({ name: this._visitStatusPipe.transform(d.status), data: d.series })),
          xaxis: {
            categories: data.months,
          }
        });

        chart.render();
      }

    });

  }

  getVisitsStatusByYear( arguement: any ) {

    this._dataInProgress.set( true );
    this._getVisitsStatusByYear( Number( arguement.value ) );

  }

}
