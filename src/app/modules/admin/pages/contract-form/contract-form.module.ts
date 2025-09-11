import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogActions, MatDialogClose, MatDialogContent } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { FlatpickrDirective } from 'angularx-flatpickr';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    SpinnerComponent,
    NgSelectModule,
    InputErrorsDirective,
    FlatpickrDirective
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    SpinnerComponent,
    NgSelectModule,
    InputErrorsDirective,
    RouterModule,
    FlatpickrDirective
  ],
})
export class ContractFormModule { }
