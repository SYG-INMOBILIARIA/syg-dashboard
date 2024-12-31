import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { validate as ISUUID } from 'uuid';

import { FinancingService } from '../../services/financing.service';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { Nomenclature } from '@shared/interfaces';
import { Financing, FinancingBody, ProyectById } from '../../interfaces';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PipesModule } from '@pipes/pipes.module';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { initFlowbite } from 'flowbite';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { QuotaForm } from '../../classes/quota.class';
import { NgSelectModule } from '@ng-select/ng-select';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { AlertService } from '@shared/services/alert.service';
import { forkJoin } from 'rxjs';
import { ProyectService } from '../../services/proyect.service';

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
export default class FinancingByProyectComponent implements OnInit {

  @ViewChild('btnCloseFinancingModal') btnCloseFinancingModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowFinancingModal') btnShowFinancingModal!: ElementRef<HTMLButtonElement>;

  private _financingService = inject( FinancingService );
  private _alertService = inject( AlertService );
  private _proyectService = inject( ProyectService );

  private _nomenclatureService = inject( NomenclatureService );
  private _router = inject( Router );
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

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _totalFinancings = signal<number>( 0 );
  private _quotesForm = signal<QuotaForm[]>([]);

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public totalFinancings = computed( () => this._totalFinancings() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public financingTypes = computed( () => this._financingTypes() );
  public financings = computed( () => this._financings() );
  public quotesForm = computed( () => this._quotesForm() );
  private _proyect = signal<ProyectById | undefined>( undefined );

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

    const proyectId = this._activatedRoute.snapshot.params['proyectId'];
    if( !ISUUID( proyectId ) ) {
      this._router.navigateByUrl('404');
      return;
    }

    this._proyectId = proyectId;
    this.financingForm.get('proyectId')?.setValue(proyectId);

    this.onGetFinancings();
    this.onLoadData( proyectId );

  }

  onGetFinancings( page = 1 ) {
    this._financingService.getFinancings( this._proyectId, page, '' )
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
      proyect: this._proyectService.getProyectById( proyectId ),
      financingTypesResponse: this._nomenclatureService.getFinancingType(),
    }).subscribe( ( { proyect, financingTypesResponse } ) => {

      const { centerCoords, polygonCoords, flatImage } = proyect;
      const { nomenclatures } = financingTypesResponse;

      this._proyect.set( proyect );
      this._financingTypes.set( nomenclatures );
    });

  }


  onSearch() {

  }

  onLoadToUpdate( financing: Financing ) {

  }

  onRemoveConfirm( financing: Financing ) {

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

    console.log({ elementsRepit, invalidQuotes });

    if( elementsRepit.length ) {
      this._alertService.showAlert(
        `Número de cuotas ${elementsRepit.join(', ')} repetido(s)`
        , 'Por favor revise las cuotas de pago'
        , 'warning');
        return;
    }

    if( this.isFormInvalid || elementsRepit.length || this.isSaving() || invalidQuotes ) {

      this.financingForm.markAllAsTouched();
      return;
    };

    this._isSaving.set( true );

    const quotas = quotasForms.map( (quotaForm) => quotaForm.values );
    this.financingForm.get('quotas')?.setValue( quotas );

    const { id, ...body } = this.financingBody;

    if( !ISUUID( id ) ) {
      this._financingService.createFinancing( body )
      .subscribe( (financingCreated) => {

        this.onGetFinancings();
        this.onResetAfterSubmit();
        this.btnShowFinancingModal.nativeElement.click();

      });

      return;
    }

  }

  onResetAfterSubmit() {
    this.financingModalTitle = 'Crear nuevo financiamiento';
    this.financingForm.reset();
    this._isSaving.set( false );
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

  onChangeFinancingType( type: Nomenclature ) {

  }

}
