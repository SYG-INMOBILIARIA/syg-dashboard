import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'totalDebt',
  standalone: true
})

export class TotalDebtPipe implements PipeTransform {
  transform( amountToPay: number, tardinessAmount = 0, totalPaid = 0 ): number {
    return (amountToPay + tardinessAmount) - totalPaid;
  }
}
