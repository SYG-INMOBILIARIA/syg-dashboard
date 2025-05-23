import { Injectable, inject } from '@angular/core';
import { AsyncValidator, UntypedFormGroup, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { ExpenseTypeService } from '../services/expense-type.service';

@Injectable({providedIn: 'root'})
export class ExpenseTypeValidatorService implements AsyncValidator {

  private _expenseTypeService = inject( ExpenseTypeService );

  validate( formGroup: UntypedFormGroup ): Observable<ValidationErrors | null> {

    const name = formGroup.get('name')?.value ?? '';
    const id = formGroup.get('id')?.value ?? 'xD';

    if( !name || name == '' ) return of( null );

    const alreadyObservable = new Observable<ValidationErrors | null>( (subscriber) => {
      this._expenseTypeService.getExpenseTypeAlreadyExists( name, id )
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
