import { CommonModule, formatCurrency } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AppState } from '@app/app.config';
import { Store } from '@ngrx/store';
import { forkJoin, Subscription } from 'rxjs';

import ApexCharts from 'apexcharts';
import { DashboardClientService } from '@app/dashboard/services/dashboard-client.service';

@Component({
  selector: 'app-overview-client-charts',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './overview-client-charts.component.html',
  styles: ``
})
export default class OverviewClientChartsComponent implements OnInit, OnDestroy {

  private _authRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store );

  private _dashboardClientService = inject( DashboardClientService );

  private _totalPaid = signal<number>( 0 );
  private _totalUnpaid = signal<number>( 0 );
  private _percentagePaid = signal<number>( 0 );

  public totalPaid = computed(() => this._totalPaid());
  public totalUnpaid = computed(() => this._totalUnpaid());
  public percentagePaid = computed(() => this._percentagePaid());

  private _clientId = signal<string | null>( null );

  private _isLoading = signal<boolean>( false );

  public isLoading = computed(() => this._isLoading());

  private _lineChartOptions: ApexCharts.ApexOptions = {
      series: [{
      name: 'Servings',
      data: [44, 55, 41, 67, 22, 43, 21, 33, 45, 31, 87, 65, 35]
    }],

    chart: {
      height: '100%',
      type: 'bar',
    },
    plotOptions: {
      bar: {
        borderRadius: 10,
        columnWidth: '10%',
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      width: 0
    },
    grid: {
      row: {
        colors: ['#fff', '#f2f2f2']
      }
    },
    xaxis: {
      labels: {
        rotate: -45
      },
      categories: ['Apples', 'Oranges', 'Strawberries', 'Pineapples', 'Mangoes', 'Bananas',
        'Blackberries', 'Pears', 'Watermelons', 'Cherries', 'Pomegranates', 'Tangerines', 'Papayas'
      ],
      tickPlacement: 'on',
    },
    yaxis: {
      title: {
        text: 'Pagos por mes',
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: "horizontal",
        shadeIntensity: 0.25,
        gradientToColors: undefined,
        inverseColors: true,
        opacityFrom: 0.85,
        opacityTo: 0.85,
        stops: [50, 0, 100]
      },
    }
  };

  private _pieChartoptions: ApexCharts.ApexOptions = {
    series: [44, 55, 13, 43, 22],
    chart: {
      width: '80%',
      type: 'pie',
    },
    labels: ['% Cuotas pagadas', '% Cuotas por pagar'],
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: '50%'
        },
        legend: {
          position: 'bottom'
        },

      }
    }]
  };

  private _pieChartSummaryOptions: ApexCharts.ApexOptions = {
    series: [44, 55, 41, 17, 15],
    chart: {
      type: 'donut',
      height: '100%',
      width: '100%',
    },
    plotOptions: {
      pie: {
        startAngle: -90,
        endAngle: 90,
        offsetY: 10
      }
    },
    grid: {
      padding: {
        bottom: -100
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200,
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  private _pieChartDateStatusOptions: ApexCharts.ApexOptions = {
    series: [44, 55, 41, 17, 15],
    chart: {
      type: 'donut',
      height: '100%',
      width: '100%',
    },
    plotOptions: {
      pie: {
        startAngle: -90,
        endAngle: 90,
        offsetY: 10
      }
    },
    grid: {
      padding: {
        bottom: -100
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200,
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  ngOnInit(): void {

    this._listenAuthRx();

  }

  private _listenAuthRx() {
    this._authRx$ = this._store.select('auth').subscribe( state  => {
      const { userAuthenticated } = state;

      if ( userAuthenticated ) {
        const { client } = userAuthenticated;

        if ( client ) {
          this._clientId.set( client.id );
          this._getChartsData();
        } else {
          this._authRx$?.unsubscribe();
          throw new Error('Client not found!!!');
        }
      } else {
        this._authRx$?.unsubscribe();
        throw new Error('User not authenticated!!!');
      }

    });
  }


  private _getChartsData() {

    this._isLoading.set( true );

    forkJoin({
      paymentsByMonth: this._dashboardClientService.getPaymentsGroupedByMonth( this._clientId()! ),
      debtsByState: this._dashboardClientService.getDebtsGroupedByState( this._clientId()! )
    }).subscribe( {
      next: ( { paymentsByMonth, debtsByState } ) => {

        const paymentsByMonthData = paymentsByMonth.reduce<{ totals: number[], labels: string[] }>( (acc, paymentByMonth) => {

          const { totalPaid, monthName, year } = paymentByMonth;

          return {
            totals: [...acc.totals, totalPaid],
            labels: [...acc.labels, `${monthName} ${year}`]
          } ;
        }, { totals: [],labels: [] } );

        this._lineChartOptions.series = [{
          name: 'S/',
          data: paymentsByMonthData.totals,
        }];

        this._lineChartOptions.xaxis = {
          labels: {
            rotate: -45
          },
          categories: paymentsByMonthData.labels,
          tickPlacement: 'on',
        };

        const { quotesByStatus, summary } = debtsByState;

        console.log({summary});

        this._pieChartoptions.series = [
          quotesByStatus.paid.percentage,
          quotesByStatus.unpaid.percentage
        ];

        this._pieChartoptions.labels = [
          `${quotesByStatus.paid.percentage}% Cuotas pagadas`,
          `${quotesByStatus.unpaid.percentage}% Cuotas por pagar`
        ];

        this._totalPaid.set( summary.totalPaid );
        this._totalUnpaid.set( summary.totalDebt );
        this._percentagePaid.set( quotesByStatus.paid.percentage  );

        this._pieChartSummaryOptions.series = [
          summary.totalPaid,
          summary.totalDebt
        ];

        this._pieChartSummaryOptions.labels = [
          `${ formatCurrency( summary.totalPaid, 'en-US', 'S/ ', 'PEN', '.2-2' ) } Total pagado`,
          `${ formatCurrency( summary.totalDebt, 'en-US', 'S/ ', 'PEN', '.2-2' ) } Total por pagar`
        ];

        this._pieChartDateStatusOptions.series = [
          debtsByState.quotesByDateStatus.overdue.count,
          debtsByState.quotesByDateStatus.current.count
        ];

        this._pieChartDateStatusOptions.labels = [
          `${debtsByState.quotesByDateStatus.overdue.count} Cuotas vencidas`,
          `${debtsByState.quotesByDateStatus.current.count} Cuotas vigentes`
        ];

        if (document.getElementById("line-chart") && typeof ApexCharts !== 'undefined') {
          const lineChart = new ApexCharts(document.getElementById("line-chart"), this._lineChartOptions);
          lineChart.render();
        }

        if (document.getElementById("pie-chart") && typeof ApexCharts !== 'undefined') {
          const lineChart = new ApexCharts(document.getElementById("pie-chart"), this._pieChartoptions);
          lineChart.render();
        }

        if (document.getElementById("pie-chart-summary") && typeof ApexCharts !== 'undefined') {
          const lineChart = new ApexCharts(document.getElementById("pie-chart-summary"), this._pieChartSummaryOptions);
          lineChart.render();
        }

        if (document.getElementById("pie-chart-date-status") && typeof ApexCharts !== 'undefined') {
          const lineChart = new ApexCharts(document.getElementById("pie-chart-date-status"), this._pieChartDateStatusOptions);
          lineChart.render();
        }

      },
      error: ( error ) => {
        console.log( error );
        this._isLoading.set( false );
      },
      complete: () => {
        this._isLoading.set( false );
      }
    } );

  }

  ngOnDestroy(): void {
    this._authRx$?.unsubscribe();
  }

}
