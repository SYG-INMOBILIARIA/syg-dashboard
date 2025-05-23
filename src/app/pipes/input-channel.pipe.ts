import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'inputChannel',
  standalone: true
})

export class InputChannelPipe implements PipeTransform {
  transform( value: string ): string {

    let inputChannel = 'Otros';

    switch (value) {
      case 'WEB':
        inputChannel = 'Web';
        break;

        case 'WHATSAPP':
          inputChannel = 'Whatsapp';
          break;

          case 'LANDING':
            inputChannel = 'Landing'
            break;

            case 'REFERRED':
              inputChannel = 'Referido'
              break;

        default:
          inputChannel = 'Otros'
          break;
    }

    return inputChannel;

  }
}
