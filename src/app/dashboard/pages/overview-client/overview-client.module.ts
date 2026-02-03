import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverviewClientRoutingModule } from './overview-client-routing.module';
import { OverviewClientLayoutComponent } from './layouts/overview-client-layout/overview-client-layout.component';
import { FormsModule } from '@angular/forms';
import OverviewClientPaymentsComponent from './pages/overview-client-payments/overview-client-payments.component';
import CardIndicatorComponent from '@app/dashboard/components/card-indicator/card-indicator.component';
import { PipesModule } from '@pipes/pipes.module';
import { PaidQuotesModalComponent } from '@modules/admin/components/paid-quotes-modal/paid-quotes-modal.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SellerMoreVisitCardComponent } from '@app/dashboard/components/seller-more-visit-card/seller-more-visit-card.component';
import { VisitorCounterCardComponent } from '@app/dashboard/components/visitor-counter-card/visitor-counter-card.component';
import { VisitPercentStatusCardComponent } from '@app/dashboard/components/visit-percent-status-card/visit-percent-status-card.component';


@NgModule({
  declarations: [
    OverviewClientLayoutComponent,
    OverviewClientPaymentsComponent,
  ],
  imports: [
    CommonModule,
    PipesModule,
    PaginationComponent,
    PaidQuotesModalComponent,
    CardIndicatorComponent,
    FormsModule,
    OverviewClientRoutingModule,
    SellerMoreVisitCardComponent,
    VisitorCounterCardComponent,
    VisitPercentStatusCardComponent
  ]
})
export default class OverviewClientModule { }
