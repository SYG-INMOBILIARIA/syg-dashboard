import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { includeNumberPatt, lowercasePatt, uppercasePatt } from "@shared/helpers/regex.helper";

export function oneUppercaseInPassword(): ValidatorFn {
  return (abstractControl: AbstractControl): ValidationErrors | null => {

    const password = abstractControl.value ?? '';

    const isValid = uppercasePatt.test( password );

    return !isValid ? { oneUpperCase: true } : null;

  }
}


export function oneLowercaseInPassword(): ValidatorFn {
  return (abstractControl: AbstractControl): ValidationErrors | null => {

    const password = abstractControl.value ?? '';

    const isValid = lowercasePatt.test( password );

    return  !isValid ? { oneLowercase: true } : null;
  }
};


export const oneNumberInPassword = (parameters: any): ValidatorFn =>
  (abstractControl: AbstractControl): ValidationErrors | null => {

    const password = abstractControl.value ?? '';

    const isValid = includeNumberPatt.test( password );

    if( !isValid ) return { oneNumber: false };

    return null;

};
