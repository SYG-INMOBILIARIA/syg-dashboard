import { NgModule } from '@angular/core';
import { MomentPipe } from './moment.pipe';
import { NetworkImagePipe } from './network-image.pipe';
import { LoteStatusClassPipe } from './lote-status-class.pipe';
import { LoteJoinCodesPipe } from './lote-join-code.pipe';
import { PaymentTypePipe } from './payment-type.pipe';
import { TotalDebtPipe } from './total-debt.pipe';
import { ExpenseTypePipe } from './expense-type.pipe';
import { ClientStatusPipe } from './client-status.pipe';
import { InputChannelPipe } from './input-channel.pipe';
import { LeadStatusPipe } from './lead-status.pipe';
import { MomentDiffPipe } from './moment-diff.pipe';
import { CivilStatusPipe } from './civil-status.pipe';
import { GenderPipe } from './gender.pipe';

@NgModule({
  imports: [
    MomentPipe,
    NetworkImagePipe,
    LoteStatusClassPipe,
    LoteJoinCodesPipe,
    PaymentTypePipe,
    TotalDebtPipe,
    ExpenseTypePipe,
    ClientStatusPipe,
    InputChannelPipe,
    LeadStatusPipe,
    MomentDiffPipe,
    CivilStatusPipe,
    GenderPipe
  ],
  exports: [
    MomentPipe,
    NetworkImagePipe,
    LoteStatusClassPipe,
    LoteJoinCodesPipe,
    PaymentTypePipe,
    TotalDebtPipe,
    ExpenseTypePipe,
    ClientStatusPipe,
    InputChannelPipe,
    LeadStatusPipe,
    MomentDiffPipe,
    CivilStatusPipe,
    GenderPipe
  ],
})
export class PipesModule {}
