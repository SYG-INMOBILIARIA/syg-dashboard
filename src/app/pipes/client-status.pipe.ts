import { Pipe, PipeTransform } from '@angular/core';
import { ClientStatus } from '../modules/admin/interfaces';

@Pipe({
  name: 'clientStatus',
  standalone: true
})

export class ClientStatusPipe implements PipeTransform {
  transform( value: ClientStatus ): string {

    let status = 'Concretado';

    switch (value) {
      case ClientStatus.Pending:
        status = 'Pendiente';
        break;

        case ClientStatus.NotFinalized:
          status = 'No-concretado';
          break;

      default:
        status = 'Concretado';
        break;
    }

    return status;

  }
}
