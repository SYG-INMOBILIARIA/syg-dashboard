import { Injectable, inject } from '@angular/core';
import { AsyncValidator, UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { VisitorService } from './visitor.service';

@Injectable({providedIn: 'root'})
export class VisitorValidatorService implements AsyncValidator {

  private _visitorService = inject( VisitorService );

  validate( formGroup: UntypedFormGroup ): Observable<ValidationErrors | null> {

    const identityNumber = formGroup.get('identityNumber')?.value ?? '';
    const id = formGroup.get('id')?.value ?? 'xD';

    if( !identityNumber || identityNumber == '' ) return of( null );

    const alreadyObservable = new Observable<ValidationErrors | null>( (subscriber) => {
      this._visitorService.getVisitorAlreadyExists( identityNumber, id )
      .subscribe( validationErrors => {

        if( validationErrors != null ) {
          formGroup.get('identityNumber')?.setErrors( validationErrors );
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
