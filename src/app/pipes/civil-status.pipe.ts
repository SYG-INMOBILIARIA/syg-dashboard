import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'civil-status',
  standalone: true
})

export class CivilStatusPipe implements PipeTransform {
  transform(value: string, ...args: any[]): string {

    switch (value) {
      case 'SINGLE':
        return 'Soltero(a)';
        case 'MARRIED':
          return 'Casado(a)';
          case 'WIDOWED':
            return 'Viudo(a)';
            case 'DIVORCED':
              return 'Divorciado(a)';

      default:
        return ''
    }
  }
}
