import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';
import 'moment/locale/es';
moment.locale('es');

export type MomentFormat = 'createAt' | 'time' | 'dayName' | 'day' | 'monthName' | 'startTime' | 'endTime' | 'now' | 'dateTime';

@Pipe({
  name: 'moment',
  standalone: true
})
export class MomentPipe implements PipeTransform {

  transform( value?: Date | string | null, format: MomentFormat = 'createAt' ): string | Date {

    if( !value ) return '';

    switch (format) {
        case 'createAt':
          return moment( value ).format('DD [de] MMMM YYYY');
          case 'time':
            return moment( '2010-10-20 ' + value ).format('h:mm a');
            case 'dayName':
              return moment( value ).format('ddd');
              case 'day':
                return moment( value ).format('DD');
                case 'monthName':
                  return moment( value ).format('MMM');
                  case 'startTime':
                    return moment( value ).format('[De] hh:mm a');
                    case 'endTime':
                      return moment( value ).format('[a] hh:mm a');
                      case 'now':
                        return moment( value ).fromNow();
                        case 'dateTime':
                          return moment( value ).format('DD [de] MMMM YYYY[,] h:mm a');

        default:
        return value
    }
  }

}
