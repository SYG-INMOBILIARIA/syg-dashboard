import { Injectable, inject } from '@angular/core';
import { AsyncValidator, UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { LeadService } from '../services/lead.service';

@Injectable({providedIn: 'root'})
export class LeadValidatorService implements AsyncValidator {

  private _leadService = inject( LeadService );

  validate( formGroup: UntypedFormGroup ): Observable<ValidationErrors | null> {

    const email = formGroup.get('email')?.value ?? '';
    const id = formGroup.get('id')?.value ?? 'xD';

    if( !email || email == '' ) return of( null );

    const alreadyObservable = new Observable<ValidationErrors | null>( (subscriber) => {
      this._leadService.getLeadAlreadyExists( email, id )
      .subscribe( validationErrors => {

        if( validationErrors != null ) {
          formGroup.get('email')?.setErrors( validationErrors );
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
