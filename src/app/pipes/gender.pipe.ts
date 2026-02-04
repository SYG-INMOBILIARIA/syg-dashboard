import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'gender',
  standalone: true
})

export class GenderPipe implements PipeTransform {
  transform(value: string): string {

    if( !value ) return '';

    switch (value) {
      case 'MEN':
        return 'Hombre';
        case 'WOMEN':
          return 'Mujer';

      default:
        return 'Otro';
    }
  }
}
