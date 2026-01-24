import { Pipe, PipeTransform } from '@angular/core';
import { LoteStatus } from '../modules/admin/enum';

@Pipe({
  name: 'loteStatusClass',
  standalone: true
})
export class LoteStatusClassPipe implements PipeTransform {
  transform( value: string ): string {

    switch (value) {
      case LoteStatus.Available:
          return 'bg-cyan-200 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
      // case LoteStatus.InProgress:
      //     return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case LoteStatus.Reserved:
          return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
          return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    }

  }
}
