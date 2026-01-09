import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { emailPatt } from '@shared/helpers/regex.helper';
import { initFlowbite } from 'flowbite';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styles: ``
})
export class LoginComponent implements OnInit {

  private _formBuilder = inject( UntypedFormBuilder );
  private _authService = inject( AuthService );
  private _router = inject( Router );

  public singinForm = this._formBuilder.group({
    username: [ null, [ Validators.required, Validators.pattern( emailPatt ) ] ], //fulanito@gmail.com
    password: [ null, [ Validators.required, Validators.minLength(6) ]], //123456
  });

  private _isLoading = signal( false );

  public isLoading = computed( () => this._isLoading() );


  get formValues(): { username: string; password: string } {
    return this.singinForm.value;
  }

  get isInvalidForm(): boolean {
    return this.singinForm.invalid;
  }

  inputErrors( field: string ) {
    return this.singinForm.get(field)?.errors ?? null;
  }

  isTouched( field: string ) {
    return this.singinForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    initFlowbite();
  }

  onSingin() {

    this.singinForm.get('')?.errors

    if( this.isInvalidForm || this.isLoading() ) return;

    this._isLoading.update( (current) => !current );

    const { username, password } = this.formValues;

    this._authService.onSingin( username, password ).subscribe({
      next: (authenticated) => {

        this._isLoading.update( (current) => !current );

      },
      error: () => {
        this._isLoading.update( (current) => !current );
      }
    });

  }

}
