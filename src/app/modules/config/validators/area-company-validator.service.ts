import { Injectable, inject } from '@angular/core';
import { AsyncValidator, UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { AreaCompanyService } from '../services/area-company.service';

@Injectable({providedIn: 'root'})
export class AreaCompanyValdidatorService implements AsyncValidator {

  private _areaCompanyService = inject( AreaCompanyService );

  validate( formGroup: UntypedFormGroup ): Observable<ValidationErrors | null> {

    const name = formGroup.get('name')?.value ?? '';
    const id = formGroup.get('id')?.value ?? 'xD';

    if( !name || name == '' ) return of( null );

    const alreadyObservable = new Observable<ValidationErrors | null>( (subscriber) => {
      this._areaCompanyService.getArealreadyExists( name, id )
      .subscribe( validationErrors => {

        if( validationErrors != null ) {
          formGroup.get('name')?.setErrors( validationErrors );
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
