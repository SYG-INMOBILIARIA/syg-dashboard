import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { validate as ISUUID } from 'uuid';

import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { TardinessConfigService } from '../../services/tardiness-config.service';
import { TardinessConfig, TardinessConfigBody } from '../../interfaces';
import { AlertService } from '@shared/services/alert.service';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-tardiness-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    InputErrorsDirective
  ],
  templateUrl: './tardiness-config.component.html',
  styles: ``
})
export default class TardinessConfigComponent implements OnInit {

  @ViewChild('btnTardinessConfigModal') btnTardinessConfigModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnCloseTardinessConfigModal') btnCloseTardinessConfigModal!: ElementRef<HTMLButtonElement>;

  private _tardinessConfigService = inject( TardinessConfigService );
  private _alertService = inject( AlertService );

  private _formBuilder = inject( UntypedFormBuilder );

  public tardinessConfigForm = this._formBuilder.group({
    id:              [ null, [] ],
    numberDays:      [ 0,   [ Validators.required, Validators.min(1), Validators.max(30) ] ],
    amountTardiness: [ 0,   [ Validators.required, Validators.min(1), Validators.max(100) ] ],
    // isActive:        [ true, [] ],
  });

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isRemoving = false;
  private _tardinessConfig = signal<TardinessConfig[]>( [] );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public tardinessConfig = computed( () => this._tardinessConfig() );

  inputErrors( field: string ) {
    return this.tardinessConfigForm.get(field)?.errors ?? null;
  }

  isTouched( field: string ) {
    return this.tardinessConfigForm.get(field)?.touched ?? false;
  }

  get isFormInvalid() { return this.tardinessConfigForm.invalid; }
  get tardinessConfigBody(): TardinessConfigBody { return  this.tardinessConfigForm.value as TardinessConfigBody; }

  ngOnInit(): void {

    this.onGetTardinessConfig();
  }


  onGetTardinessConfig( page = 1 ) {

    // const allowList = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiPaymentMethod && permission.methods.includes( 'GET' )
    // );

    // if( !allowList ) {
    //   this._allowList.set( false );
    //   return;
    // }

    this._isLoading.set( true );
    this._tardinessConfigService.getTardinessConfig( page, '' )
    .subscribe({
      next: ({ tardinessConfigs, total }) => {

        this._tardinessConfig.set( tardinessConfigs );
        this._isLoading.set( false );

        setTimeout(() => {
          initFlowbite();
        }, 250);

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onResetAfterSubmit() {
    this.tardinessConfigForm.reset();
    this._isSaving.set( false );
  }

  onLoadToUpdate( tardinessConfig: TardinessConfig ) {

    this._alertService.showLoading();

    this._tardinessConfigService.getTardinessConfigById( tardinessConfig.id )
    .subscribe({
      next: (tardinessConfig) => {

        console.log(tardinessConfig);

        const { createAt, isActive, userCreate, ...rest } = tardinessConfig;

        this.tardinessConfigForm.reset( rest );
        // this.btnTardinessConfigModal.nativeElement.click();
        this._alertService.close();

      }, error: (err) => {
        this._alertService.close();
      }
    })
  }

  onSubmit() {

    if( this.isFormInvalid || this.isSaving() ) return;

    const { id, ...body } = this.tardinessConfigBody;

    if( ISUUID( id ) ) {

      this._tardinessConfigService.updateTardinessConfig( id, body )
      .subscribe({
        next: async ( paymentMethodCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseTardinessConfigModal.nativeElement.click();
          this._alertService.showAlert('Configuración de mora actualizado exitosamente', undefined, 'success');
          this.onGetTardinessConfig();

        }, error: (err) => {
          this._isSaving.set( false);
        }
      });

      return;
    }

  }

  onCheckedUnchedked( tardinessConfig: TardinessConfig ) {
    this._tardinessConfigService.removeTardinessConfig( tardinessConfig.id )
    .subscribe(  );
  }

}
