import { Directive, ElementRef, Input, inject, input } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

@Directive({
  selector: '[inputErrors]',
  standalone: true
})
export class InputErrorsDirective {

  private _el = inject<ElementRef<HTMLSpanElement>>( ElementRef<HTMLSpanElement> );

  private _errors?: ValidationErrors | null;

  @Input() set errors( value: ValidationErrors | null ) {
    this._errors = value;
    this.setErrorMessage();
  };

  public inputLabel = input.required<string>();

  setErrorMessage() {

    if( !this._errors ) {
      this._el.nativeElement.innerHTML = '';
      return;
    }

    let warningSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 mr-2 text-red-500">
          <path fill-rule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clip-rule="evenodd"></path>
      </svg>
    `;

    const errors = Object.keys( this._errors );

    if( errors.includes( 'required' ) ) {
      this._el.nativeElement.innerHTML = warningSvg + ` Requerido`;
      return;
    }

    if( errors.includes( 'min' ) ) {
      const min = this._errors['min'].min;
      // const current = this._errors['min'].actual;
      this._el.nativeElement.innerHTML = warningSvg + ` Valor mínimo ${ min }`;
      return;
    }

    if( errors.includes( 'max' ) ) {
      const max = this._errors['max'].max;
      this._el.nativeElement.innerHTML = warningSvg + ` Valor máximo ${ max }`;
      return;
    }

    if( errors.includes( 'minlength' ) ) {
      const min = this._errors['minlength']?.requiredLength;
      const current = this._errors['minlength']?.actualLength;

      this._el.nativeElement.innerHTML = warningSvg + ` Mínimo ${current}/${min} caracteres`;
      return;
    }

    if( errors.includes( 'maxlength' ) ) {
      const max = this._errors['maxlength']?.requiredLength;

      this._el.nativeElement.innerHTML = warningSvg + ` Máximo ${max} caracteres`;
      return;
    }

    if( errors.includes( 'pattern' ) ) {
      this._el.nativeElement.innerHTML = warningSvg + ` ${ this.inputLabel() } inválido`;
      return;
    }

    if( errors.includes( 'alreadyexists' ) ) {
      this._el.nativeElement.innerHTML = warningSvg + ` Ya existe un registro con este ${ this.inputLabel().toLowerCase() }`;
      return;
    }

    if( errors.includes( 'noEqual' ) ) {
      this._el.nativeElement.innerHTML = warningSvg + ` ${ this.inputLabel().toLowerCase() } no coinciden`;
      return;
    }

  }

}
