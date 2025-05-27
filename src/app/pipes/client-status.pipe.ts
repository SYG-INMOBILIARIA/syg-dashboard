import { Pipe, PipeTransform } from '@angular/core';
import { ClientStatus } from '../modules/admin/interfaces';

@Pipe({
  name: 'clientStatus',
  standalone: true
})

export class ClientStatusPipe implements PipeTransform {
  transform( value?: ClientStatus ): string {

    let status = 'No-Concretado';

    switch (value) {
      case ClientStatus.Pending:
        status = 'Pendiente';
        break;

        case ClientStatus.Finalized:
          status = 'Concretado';
          break;

      default:
        status = 'No-Concretado';
        break;
    }

    return status;

  }
}
