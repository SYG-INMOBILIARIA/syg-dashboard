import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LotesMapComponent } from '../../components/lotes-map/lotes-map.component';
import { SimplebarAngularModule } from 'simplebar-angular';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LotesMapComponent,
    SimplebarAngularModule,
    SpinnerComponent,
    InputErrorsDirective,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LotesMapComponent,
    SimplebarAngularModule,
    SpinnerComponent,
    InputErrorsDirective,
  ],
  providers: [],
})
export class LotesModule {}
