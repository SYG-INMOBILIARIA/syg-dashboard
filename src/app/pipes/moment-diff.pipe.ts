import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

@Pipe({
  name: 'momentDiff',
  standalone: true
})

export class MomentDiffPipe implements PipeTransform {
  transform(value: string | Date, ...args: any[]): number {
    const now = moment();
    const date = moment(value);
    return date.diff(now, 'days');
  }
}
