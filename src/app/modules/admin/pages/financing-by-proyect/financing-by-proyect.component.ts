import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { validate as ISUUID } from 'uuid';
import { initFlowbite } from 'flowbite';
import { Subscription, forkJoin } from 'rxjs';

import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { Nomenclature } from '@shared/interfaces';
import { AlertService } from '@shared/services/alert.service';
import { PipesModule } from '@pipes/pipes.module';
import { FinancingService } from '../../services/financing.service';
import { QuotaForm } from '../../classes/quota.class';
import { Financing, FinancingBody, Proyect } from '../../interfaces';
import { ProyectService } from '../../services/proyect.service';
import { FinancingType } from '../../enum/financing-type.type';
import { Store } from '@ngrx/store';
import { AppState } from '@app/app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiFinancing } from '@shared/helpers/web-apis.helper';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    SpinnerComponent,
    NgSelectModule,
    InputErrorsDirective
  ],
  templateUrl: './financing-by-proyect.component.html',
  styles: ``
})
export default class FinancingByProyectComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnCloseFinancingModal') btnCloseFinancingModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowFinancingModal') btnShowFinancingModal!: ElementRef<HTMLButtonElement>;

  private _financingService = inject( FinancingService );
  private _alertService = inject( AlertService );
  private _proyectService = inject( ProyectService );

  private _nomenclatureService = inject( NomenclatureService );
  private _activatedRoute = inject( ActivatedRoute );
  private _proyectId = '';

  financingModalTitle = 'Crear nuevo financiamiento';

  private _formBuilder = inject( UntypedFormBuilder );
  public financingForm = this._formBuilder.group({
    id:                   [ '', [] ],
    name:                 [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    financingType:        [ null, [ Validators.required ] ],
    initial:              [ 0, [ Validators.required ] ],
    quotas:               [ [], [ Validators.minLength( 1 ) ] ],
    proyectId:            [ null, [ Validators.required ] ],
  }, {
    // updateOn: 'blur',
    // asyncValidators: [ this._roleValidatorService.alreadyRoleValidator() ],
  });

  private _financingTypes = signal<Nomenclature[]>([]);
  private _financings = signal<Financing[]>([]);
  private _proyects = signal<Proyect[]>([]);

  private _initialLabel = signal( 'Monto Inicial' );
  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _totalFinancings = signal<number>( 0 );
  private _quotesForm = signal<QuotaForm[]>([]);

  public searchInput = new FormControl( '', [ Validators.pattern( fullTextPatt ) ] );
  public proyectIdInput = new FormControl( null, [ Validators.pattern( fullTextPatt ) ] );

  public totalFinancings = computed( () => this._totalFinancings() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public financingTypes = computed( () => this._financingTypes() );
  public proyects = computed( () => this._proyects() );
  public financings = computed( () => this._financings() );
  public quotesForm = computed( () => this._quotesForm() );
  public initialLabel = computed( () => this._initialLabel() );
  private _proyect = signal<Proyect | undefined>( undefined );
  private _allowList = signal( true );
  public allowList = computed( () => this._allowList() );

  public proyectName = computed( () => this._proyect()?.name ?? '' );
  get isFormInvalid() { return this.financingForm.invalid; }
  get financingBody(): FinancingBody { return  this.financingForm.value as FinancingBody; }
  get isInvalidSearchInput() { return this.searchInput.invalid; }

  inputErrors( field: string ) {
    return this.financingForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.financingForm.errors; }

  isTouched( field: string ) {
    return this.financingForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {

    this.onListenAuthRx();

    const proyectId = this._activatedRoute.snapshot.params['proyectId'];
    this._proyectId = proyectId;

    if( ISUUID( proyectId ) ) {
      this.proyectIdInput?.setValue(proyectId);
    }

    this.onGetFinancings();
    this.onLoadData( proyectId );

  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetFinancings( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiFinancing && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    const proyectId = this.proyectIdInput.value ?? '';
    const filter = this.searchInput.value ?? '';

    this._financingService.getFinancings( proyectId, page, filter )
    .subscribe( ({ financings, total  }) => {
      this._financings.set( financings );
      this._totalFinancings.set( total );

      setTimeout(() => {
        initFlowbite();
      }, 250);
    });
  }

  onLoadData( proyectId: string ) {

    forkJoin({
      listProyects: this._proyectService.getProyects( 1, '', 100 ),
      financingTypesResponse: this._nomenclatureService.getFinancingType(),
    }).subscribe( ( { listProyects, financingTypesResponse } ) => {

      const { proyects, total } = listProyects;
      const { nomenclatures } = financingTypesResponse;

      this._proyects.set( proyects );
      this._financingTypes.set( nomenclatures );
    });

  }

  onLoadToUpdate( financing: Financing ) {

    const { id } = financing;

    this._financingService.getFinancingById( id )
    .subscribe( (financingFinded) => {

      console.log({financingFinded});

      const { proyect, quotas } = financingFinded;

      this._quotesForm.set([]);

      quotas.forEach(quota => {
        this._quotesForm.update( (current) => {
          current.push( new QuotaForm( quota.numberOfQuotes, quota.interestPercent, quota.id ) );
          return current;
        } );
      });

      this.financingModalTitle = 'Actualizar financiamiento';
      this.financingForm.reset( {
        ...financingFinded,
        proyectId: proyect.id
      } );

      this.btnShowFinancingModal.nativeElement.click();


    } );

  }

  async onRemoveConfirm( financing: Financing ) {
    const responseConfirm = await this._alertService.showConfirmAlert(
      'Verifique que no haya un contrato asociado a este financiamiento',
      `¿Está seguro de eliminar el financiamiento: "${ financing.name }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._onRemoveFinancing( financing.id );
    }
  }

  private _onRemoveFinancing( id: string ) {
    this._financingService.deleteFinancing( id )
    .subscribe( (loteDeleted) => {
      this._alertService.showAlert( `Financiamiento eliminado exitosamente`, undefined, 'success');

      this.onGetFinancings();
    });
  }

  onSubmit() {

    const quotasForms = this._quotesForm();
    const invalidQuotes = quotasForms.some( (quotaForm) => quotaForm.isInvalid );
    const elementsRepit = quotasForms.reduce( ( acc: number[], current, _, elements ) => {

      const count = elements.filter( (element) => element.values.numberOfQuotes == current.values.numberOfQuotes ).length;

      if( count > 1 && !acc.includes( current.values.numberOfQuotes ) ) {
        acc.push( current.values.numberOfQuotes );
      }

      return acc;
    }, [] );

    // console.log({ elementsRepit, invalidQuotes });

    if( elementsRepit.length ) {
      this._alertService.showAlert(
        `Número de cuotas ${elementsRepit.join(', ')} repetido(s)`
        , 'Por favor revise las cuotas de pago'
        , 'warning');
        return;
    }

    if( this.isFormInvalid || elementsRepit.length > 0 || this.isSaving() || invalidQuotes ) {

      this.financingForm.markAllAsTouched();
      return;
    };

    const quotas = quotasForms.map( (quotaForm) => quotaForm.values );
    this.financingForm.get('quotas')?.setValue( quotas );

    const { id, ...body } = this.financingBody;

    if( !ISUUID( id ) ) {

      const allowCreate = this._webUrlPermissionMethods.some(
        (permission) => permission.webApi == apiFinancing && permission.methods.includes( 'POST' )
      );

      if( !allowCreate ) {
        this._alertService.showAlert( undefined, 'No tiene permiso para crear un financiamiento', 'warning');
        return;
      }

      this._isSaving.set( true );

      this._financingService.createFinancing( body )
      .subscribe( (financingCreated) => {

        this.onGetFinancings();
        this.onResetAfterSubmit();
        this.btnShowFinancingModal.nativeElement.click();
        this._alertService.showAlert( 'Financiamiento creado exitosamente', undefined, 'success' );

      });

      return;
    }

    const allowCreate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiFinancing && permission.methods.includes( 'PATCH' )
    );

    if( !allowCreate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un financiamiento', 'warning');
      return;
    }

    this._isSaving.set( true );

    this._financingService.updateFinancing( id, body )
    .subscribe( (financingUpdate) => {

      this.onGetFinancings();
      this.onResetAfterSubmit();
      this.btnShowFinancingModal.nativeElement.click();
      this._alertService.showAlert( 'Financiamiento actualizado exitosamente', undefined, 'success' );

    });


  }

  onResetAfterSubmit() {
    this.financingModalTitle = 'Crear nuevo financiamiento';
    this.financingForm.reset({
      proyectId: this._proyectId
    });
    this._isSaving.set( false );
    this._quotesForm.set([]);
  }

  onAddHourRate() {
    this._quotesForm.update( (current) => {
      current.push( new QuotaForm( 0, 0 ) );
      return current;
    } );
  }

  onRemoveHourRate( index: number ) {
    this._quotesForm.update( (current) => {
      return current.filter( (_, i) => i != index );
    } );
  }

  onChangeFinancingType( value: string ) {

    this.financingForm.get('initial')?.clearValidators();
    this.financingForm.updateValueAndValidity();

    if( value == FinancingType.amount ) {
      this.financingForm.get('initial')?.addValidators([ Validators.min(1000) ]);
      this._initialLabel.set('Monto Inicial (S/)*');
    } else {
      this.financingForm.get('initial')?.addValidators([ Validators.min(5), Validators.max(100) ]);
      this._initialLabel.set('Porcentaje Inicial (%) *');
    }

    this.financingForm.get('initial')?.setValue(0);
    this.financingForm.updateValueAndValidity();

  }

  ngOnDestroy(): void {
      this._authrx$?.unsubscribe();
  }

}
