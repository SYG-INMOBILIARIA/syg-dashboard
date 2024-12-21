import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DrawLoteMapHandlerComponent } from '../../components/draw-lote-map-handler/draw-lote-map-handler.component';
import { LotesMapComponent } from '../../components/lotes-map/lotes-map.component';
import { SimplebarAngularModule } from 'simplebar-angular';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DrawLoteMapHandlerComponent,
    LotesMapComponent,
    SimplebarAngularModule,
    SpinnerComponent,
    InputErrorsDirective,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DrawLoteMapHandlerComponent,
    LotesMapComponent,
    SimplebarAngularModule,
    SpinnerComponent,
    InputErrorsDirective,
  ],
  providers: [],
})
export class LotesModule {}
