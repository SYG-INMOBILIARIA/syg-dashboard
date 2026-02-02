import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'visit-status',
  standalone: true
})

export class VisitStatusPipe implements PipeTransform {
  transform(value: string, ...args: any[]): string {

    switch (value) {
      case 'CANCELLED':
        return 'Cancelado';
        case 'SEPARATED':
          return 'Separado';
          case 'FINANCED':
            return 'Financiado';
      default:
        return ''
    }
  }
}
