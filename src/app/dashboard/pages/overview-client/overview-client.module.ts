import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverviewClientRoutingModule } from './overview-client-routing.module';
import { OverviewClientLayoutComponent } from './layouts/overview-client-layout/overview-client-layout.component';
import { FormsModule } from '@angular/forms';
import OverviewClientPaymentsComponent from './pages/overview-client-payments/overview-client-payments.component';
import CardIndicatorComponent from '@app/dashboard/components/card-indicator/card-indicator.component';
import { PipesModule } from '@pipes/pipes.module';
import { PaidQuotesModalComponent } from '@modules/admin/components/paid-quotes-modal/paid-quotes-modal.component';


@NgModule({
  declarations: [
    OverviewClientLayoutComponent,
    OverviewClientPaymentsComponent,
  ],
  imports: [
    CommonModule,
    PipesModule,
    PaidQuotesModalComponent,
    CardIndicatorComponent,
    FormsModule,
    OverviewClientRoutingModule
  ]
})
export default class OverviewClientModule { }
