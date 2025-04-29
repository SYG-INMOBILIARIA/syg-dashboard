import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import PaymentIndicatorsComponent from '../../components/payment-indicators/payment-indicators.component';

@Component({
  selector: 'app-payment-profile',
  standalone: true,
  imports: [
    CommonModule,
    PaymentIndicatorsComponent
  ],
  templateUrl: './payment-profile.component.html',
  styles: ``
})
export default class PaymentProfileComponent {

}
