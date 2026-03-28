import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type DateFilterMode = 'none' | 'equal' | 'range';

export const dateFilterValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const mode = control.get('dateMode')?.value as DateFilterMode;

    const equalToDate = control.get('equalToDate')?.value;
    const rangeToDate = control.get('rangeToDate')?.value;
    // const toDate = control.get('toDate')?.value;


    if (mode === 'equal' && !equalToDate) {
      return { equalToDateequired: true };
    }

    if (mode === 'range') {
      if (!rangeToDate) {
        return { rangeDateRequired: true };
      }

    }

    return null;
  };
};
