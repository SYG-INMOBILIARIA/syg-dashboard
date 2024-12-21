import { NgModule } from '@angular/core';
import { MomentPipe } from './moment.pipe';
import { NetworkImagePipe } from './network-image.pipe';
import { LoteStatusClassPipe } from './lote-status-class.pipe';

@NgModule({
  imports: [ MomentPipe, NetworkImagePipe, LoteStatusClassPipe ],
  exports: [ MomentPipe, NetworkImagePipe, LoteStatusClassPipe ],
})
export class PipesModule {}
