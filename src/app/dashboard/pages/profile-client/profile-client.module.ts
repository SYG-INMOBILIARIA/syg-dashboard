import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ProfileClientLayoutComponent } from './layouts/profile-client-layout/profile-client-layout.component';
import { ClientInfoComponent } from './pages/client-info/client-info.component';
import { ClientPaymentsComponent } from './pages/client-payments/client-payments.component';
import { ProfileClientRoutingModule } from './profile-client-routing.module';
import { PipesModule } from '@pipes/pipes.module';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { PaidQuotesModalComponent } from '@modules/admin/components/paid-quotes-modal/paid-quotes-modal.component';

@NgModule({
  declarations: [
    ProfileClientLayoutComponent,
    ClientInfoComponent,
    ClientPaymentsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    InputErrorsDirective,
    ProfileClientRoutingModule,
    PaginationComponent,
    SpinnerComponent,
    PaidQuotesModalComponent
  ],

})
export default class ProfileClientModule { }
