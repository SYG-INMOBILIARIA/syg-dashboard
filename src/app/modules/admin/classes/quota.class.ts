import { FormControl, Validators } from '@angular/forms';
import { v4 as UUID } from 'uuid';

export class QuotaForm {

  private _id: string | null = '';

  private _idAux = UUID();

  numberOfQuotes!: FormControl<number | null>;
  interestPercent!: FormControl<number | null>;

  constructor( hour: number | null, rate: number, id: string | null = null, ) {

    this._id = id ;
    this.numberOfQuotes = new FormControl( hour, [ Validators.required, Validators.min(6), Validators.max(84) ] );
    this.interestPercent = new FormControl( rate, [ Validators.required, Validators.min( 0 ), Validators.max(30) ] );

  }

  get isInvalid() { return this.numberOfQuotes.invalid || this.interestPercent.invalid; };
  get isInvalidNumberOfQuotes() { return this.numberOfQuotes?.invalid; }
  get isInvalidInterestPercent() { return this.interestPercent?.invalid; }

  get auxId() { return this._idAux; }

  get values() {
    return {
      id: this._id,
      numberOfQuotes: +this.numberOfQuotes.value!,
      interestPercent: +this.interestPercent.value!,
    }
   }

}
