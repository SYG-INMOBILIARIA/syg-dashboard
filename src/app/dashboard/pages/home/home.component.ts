import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import ApexCharts from 'apexcharts';
import { initFlowbite } from 'flowbite';
import { forkJoin, Subscription } from 'rxjs';
import { DashboardStats, SellerPerformance, MonthlyCommissions, ClientStatus, RecentActivity } from '../../interfaces';
import { DashboardService } from '../../services/dashboard.service';
import { PipesModule } from '@pipes/pipes.module';
import { VisitPercentStatusCardComponent } from '@app/dashboard/components/visit-percent-status-card/visit-percent-status-card.component';
import { VisitorCounterCardComponent } from '@app/dashboard/components/visitor-counter-card/visitor-counter-card.component';
import { SellerMoreVisitCardComponent } from '@app/dashboard/components/seller-more-visit-card/seller-more-visit-card.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PipesModule,
    VisitPercentStatusCardComponent,
    VisitorCounterCardComponent,
    SellerMoreVisitCardComponent
  ],
  styles: ``,
})
export class HomeComponent implements OnInit, OnDestroy {

  private _dashboardService = inject( DashboardService );

  private subscriptions: Subscription[] = [];

  // Dashboard Stats
  public dashboardStats: DashboardStats | null = null;
  public topSellers: SellerPerformance[] = [];
  public recentActivity: RecentActivity[] = [];

  // Chart Options
  private lineChartOptions = {
    chart: {
      height: "100%",
      maxWidth: "100%",
      type: "line",
      fontFamily: "Inter, sans-serif",
      dropShadow: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
    },
    tooltip: {
      enabled: true,
      x: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 6,
    },
    grid: {
      show: true,
      strokeDashArray: 4,
      padding: {
        left: 2,
        right: 2,
        top: -26
      },
    },
    series: [
      {
        name: "Comisiones",
        data: [],
        color: "#1A56DB",
      }
    ],
    legend: {
      show: false
    },
    xaxis: {
      categories: [],
      labels: {
        show: true,
        style: {
          fontFamily: "Inter, sans-serif",
          cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400'
        }
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: false,
    },
  };

  private pieChartOptions = {
    chart: {
      type: 'pie',
      height: '250px',
      fontFamily: "Inter, sans-serif",
    },
    series: [],
    labels: [],
    colors: ['#1A56DB', '#7E3AF2', '#E02424', '#31C48D'],
    legend: {
      position: 'bottom',
      fontFamily: "Inter, sans-serif",
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  private barChartOptions = {
    chart: {
      type: 'bar',
      height: '100%',
      fontFamily: "Inter, sans-serif",
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '70%',
        borderRadius: 8,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 0,
      colors: ['transparent'],
    },
    series: [{
      name: 'Clientes Concretados',
      data: []
    }],
    xaxis: {
      categories: [],
      labels: {
        style: {
          fontFamily: "Inter, sans-serif",
          cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400'
        }
      },
    },
    yaxis: {
      show: false,
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + " clientes"
        }
      }
    }
  };


  ngOnInit(): void {
    this.loadDashboardData();

    setTimeout(() => {
      initFlowbite();
    }, 400);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadDashboardData(): void {

    forkJoin({
      stats: this._dashboardService.getDashboardStats(),
      topSellers: this._dashboardService.getTopSellers(),
      recentActivvity: this._dashboardService.getRecentActivity(),
      monthlyCommissions: this._dashboardService.getMonthlyCommissions(),
      clientStatus: this._dashboardService.getClientStatusDistribution()
    }).subscribe({
      next: ({ stats, topSellers, recentActivvity, monthlyCommissions, clientStatus }) => {

        this.dashboardStats = stats;
        this.topSellers = topSellers;
        this.recentActivity = recentActivvity;
        this.updateLineChart(monthlyCommissions);
        this.updatePieChart(clientStatus);

      }
    })
    // Load Dashboard Stats

  }

  private initializeCharts(): void {
    if (document.getElementById("line-chart") && typeof ApexCharts !== 'undefined') {
      const lineChart = new ApexCharts(document.getElementById("line-chart"), this.lineChartOptions);
      lineChart.render();
    }

    if (document.getElementById("pie-chart") && typeof ApexCharts !== 'undefined') {
      const pieChart = new ApexCharts(document.getElementById("pie-chart"), this.pieChartOptions);
      pieChart.render();
    }

    if (document.getElementById("bar-chart") && typeof ApexCharts !== 'undefined') {
      const barChart = new ApexCharts(document.getElementById("bar-chart"), this.barChartOptions);
      barChart.render();
    }
  }

  private updateLineChart(commissions: MonthlyCommissions[]): void {
    if (document.getElementById("line-chart") && typeof ApexCharts !== 'undefined') {
      const chart = new ApexCharts(document.getElementById("line-chart"), {
        ...this.lineChartOptions,
        series: [{
          name: "Comisiones",
          data: commissions.map(c => c.amount),
          color: "#1A56DB",
        }],
        xaxis: {
          ...this.lineChartOptions.xaxis,
          categories: commissions.map(c => c.month)
        }
      });
      chart.render();
    }
  }

  private updatePieChart(status: ClientStatus[]): void {
    if (document.getElementById("pie-chart") && typeof ApexCharts !== 'undefined') {
      const chart = new ApexCharts(document.getElementById("pie-chart"), {
        ...this.pieChartOptions,
        series: status.map(s => s.count),
        labels: status.map(s => s.status)
      });
      chart.render();
    }
  }
}
