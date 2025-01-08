import { Pipe, PipeTransform } from '@angular/core';
import { Lote } from '../modules/admin/interfaces';

@Pipe({
  name: 'loteJoinCodes',
  standalone: true
})
export class LoteJoinCodesPipe implements PipeTransform {

  transform( lotes: Lote[] ): any {
    const codes = lotes.reduce<string[]>( (acc, lote) => {
      acc.push( lote.code );
      return acc;
    }, []);

    return codes.join(' - ');
  }

}
