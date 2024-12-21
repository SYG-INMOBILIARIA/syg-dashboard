import { Injectable, inject } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';

import { RoleService } from '../services/role.service';

@Injectable({
  providedIn: 'root'
})
export class RoleValidatorService {

  private _roleService = inject( RoleService );

  alreadyRoleValidator(): AsyncValidatorFn {

    return (formGroup: AbstractControl): Observable<ValidationErrors | null> => {

      const id: string = formGroup.get('id')?.value ?? '';
      const code: string = formGroup.get('code')?.value ?? 'xD';

      if( !code || (code == '' || code.length < 5 ) ) return of( null );

      const alreadyObservable = new Observable<ValidationErrors | null>( (subscriber) => {
        this._roleService.getRoleAlreadyExists( code, id )
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
  }

}
