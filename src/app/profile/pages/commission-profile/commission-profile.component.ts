import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import CommissionIndicatorsComponent from '../../components/commission-indicators/commission-indicators.component';

@Component({
  selector: 'app-commission-profile',
  standalone: true,
  imports: [
    CommonModule,
    CommissionIndicatorsComponent
  ],
  templateUrl: './commission-profile.component.html',
  styles: ``
})
export default class CommissionProfileComponent {

}
