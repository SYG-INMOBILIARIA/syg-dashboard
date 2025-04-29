import { Injectable, inject } from '@angular/core';
import { AsyncValidator, UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { UserService } from '../services/user.service';

@Injectable({providedIn: 'root'})
export class UserValidatorService implements AsyncValidator {

  private _userService = inject( UserService );

  validate( formGroup: UntypedFormGroup ): Observable<ValidationErrors | null> {

    const email = formGroup.get('email')?.value ?? '';
    const identityNumber = formGroup.get('identityNumber')?.value ?? '';

    const id = formGroup.get('id')?.value ?? 'xD';

    if( !email || email == '' && !identityNumber || identityNumber == '' ) return of( null );

    const alreadyObservable = new Observable<ValidationErrors | null>( (subscriber) => {
      this._userService.getUserlreadyExists( email, identityNumber, id )
      .subscribe( ({ alreadyEmail, alreadyIdentityNumber }) => {

        if( alreadyEmail ) formGroup.get('email')?.setErrors( { alreadyexists: true } );
        if( alreadyIdentityNumber ) formGroup.get('identityNumber')?.setErrors( { alreadyexists: true } );


        subscriber.next( alreadyEmail || alreadyIdentityNumber ? { alreadyexists: true } : null );

        subscriber.complete();

      } );
    } );

    return alreadyObservable;

  }

  registerOnValidatorChange?(fn: () => void): void {
    throw new Error('Method not implemented.');
  }

}
