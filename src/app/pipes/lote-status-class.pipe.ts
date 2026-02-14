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
      case LoteStatus.Credit:
          return 'bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case LoteStatus.Reserved:
          return 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
          return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    }

  }
}
