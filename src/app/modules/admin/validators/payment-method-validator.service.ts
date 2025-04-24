import { Injectable, inject } from '@angular/core';
import { AsyncValidator, UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { PaymentMethodService } from '../services/payment-method.service';

@Injectable({providedIn: 'root'})
export class PaymentMethodValidatorService implements AsyncValidator {

  private _paymentMethodService = inject( PaymentMethodService );

  validate( formGroup: UntypedFormGroup ): Observable<ValidationErrors | null> {

    const code = formGroup.get('code')?.value ?? '';
    const id = formGroup.get('id')?.value ?? 'xD';

    if( !code || code == '' ) return of( null );

    const alreadyObservable = new Observable<ValidationErrors | null>( (subscriber) => {
      this._paymentMethodService.getPaymentMethodAlreadyExists( code, id )
      .subscribe( validationErrors => {

        if( validationErrors != null ) {
          formGroup.get('code')?.setErrors( validationErrors );
        }

        subscriber.next( validationErrors );

        subscriber.complete();

      } );
    } );

    return alreadyObservable;

  }

  registerOnValidatorChange?(fn: () => void): void {
    throw new Error('Method not implemented.');
  }

}
