import { Pipe, PipeTransform } from '@angular/core';
import { PaymentType } from '../modules/admin/enum';

@Pipe({
  name: 'paymentType',
  standalone: true
})

export class PaymentTypePipe implements PipeTransform {
  transform(value: PaymentType, ...args: any[]): any {
    return value == PaymentType.cash ? 'Al contrado' : 'Crédito';
  }
}
