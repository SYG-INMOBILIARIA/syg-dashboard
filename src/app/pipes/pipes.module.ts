import { NgModule } from '@angular/core';
import { MomentPipe } from './moment.pipe';
import { NetworkImagePipe } from './network-image.pipe';
import { LoteStatusClassPipe } from './lote-status-class.pipe';
import { LoteJoinCodesPipe } from './lote-join-code.pipe';
import { PaymentTypePipe } from './payment-type.pipe';
import { TotalDebtPipe } from './total-debt.pipe';

@NgModule({
  imports: [
    MomentPipe,
    NetworkImagePipe,
    LoteStatusClassPipe,
    LoteJoinCodesPipe,
    PaymentTypePipe,
    TotalDebtPipe
  ],
  exports: [
    MomentPipe,
    NetworkImagePipe,
    LoteStatusClassPipe,
    LoteJoinCodesPipe,
    PaymentTypePipe,
    TotalDebtPipe
  ],
})
export class PipesModule {}
