import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'leadStatus',
  standalone: true
})

export class LeadStatusPipe implements PipeTransform {
  transform( value: string ): string {

    let inputChannel = 'No concretado';

    switch (value) {
      case 'WAITING_FOR_ATTENTION':
        inputChannel = 'Por atender';
        break;

        case 'BEGIN_ATTENDED':
          inputChannel = 'Atendiendo';
          break;

          case 'CONCRETE':
            inputChannel = 'Concretado'
            break;

        default:
          inputChannel = 'No concretado'
          break;
    }

    return inputChannel;

  }
}
