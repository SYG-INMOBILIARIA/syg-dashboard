import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { Subscription, forkJoin } from 'rxjs';
import { validate as ISUUID } from 'uuid';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { NgSelectModule } from '@ng-select/ng-select';

import { emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, phonePatt } from '@shared/helpers/regex.helper';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { AlertService } from '@shared/services/alert.service';
import { Nomenclature } from '@shared/interfaces';
import { PipesModule } from '@pipes/pipes.module';
import { LeadService } from '../../services/lead.service';
import { IdentityDocumentService } from '../../services/identity-document.service';
import { Client, IdentityDocument, Lead, LeadBody, LeadIndicators, PersonType } from '../../interfaces';
import { UserService } from '../../../security/services/user.service';
import { User } from '../../../security/interfaces';
import { LeadValidatorService } from '../../validators/lead-validator.service';
import moment from 'moment';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiLead } from '@shared/helpers/web-apis.helper';
import { environments } from '@envs/environments';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    InputErrorsDirective,
    SpinnerComponent,
    PaginationComponent,
    NgSelectModule,
    FlatpickrDirective
  ],
  templateUrl: './leads.component.html',
  styles: ``
})
export default class LeadsComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnCloseLeadModal') btnCloseLeadModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnCloseAssignAdvisorModal') btnCloseAssignAdvisorModal!: ElementRef<HTMLButtonElement>;

  @ViewChild('btnShowLeadModal') btnShowLeadModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowAssignAdvisorModal') btnShowAssignAdvisorModal!: ElementRef<HTMLButtonElement>;


  public leadModalTitle = 'Crear nuevo Lead (cliente potencial)';

  maxDate: Date = new Date();

  private _leadService = inject( LeadService );
  private _leadValidatorService = inject( LeadValidatorService );

  private _identityDocService = inject( IdentityDocumentService );
  private _nomenclatureService = inject( NomenclatureService );
  private _userService = inject( UserService );
  private _alertService = inject( AlertService );
  private _formBuilder = inject( UntypedFormBuilder );
  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isJuridicPerson = signal( false );
  private _allowList = signal( true );
  private _isReadOnly = signal( false );
  private _leadToAssignAdvisor = signal<Lead | null>( null );
  private _leadIndicators = signal<LeadIndicators>( { count: 0, waitingForAttention: 0, beginAttended: 0, concrete: 0, conversion: 0 } );

  public defaultImgUrl = environments.defaultImgUrl;

  public searchUserInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public leadForm = this._formBuilder.group({
    id:                  [ '', [] ],
    name:                [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    surname:             [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    bussinessName:       [ '', [ Validators.pattern( fullTextPatt ) ] ],
    personType:          [ null, [ Validators.required ] ],
    identityDocumentId:  [ null, [] ],
    identityNumber:      [ '', [ Validators.pattern( numberDocumentPatt ) ] ],
    email:               [ '', [ Validators.required, Validators.pattern( emailPatt ) ] ],
    phone:               [ '', [ Validators.required, Validators.pattern( phonePatt ) ] ],
    inputChannel:        [ null, [] ],
    admissionDate:       [ '', [ Validators.required ] ],
    adviserUserId:       [ null, [] ],
    leadStatus:          [ null, [ Validators.required ] ],
    observation:         [ '', [] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._leadValidatorService ],
  });

  public assignAdvisorForm = this._formBuilder.group({
    id:                  [ '', [] ],
    adviserUserId:       [ null, [ Validators.required ] ]
  });

  private _totalLeads = signal<number>( 0 );

  private _isRemoving = false;
  private _leads = signal<Lead[]>( [] );

  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);
  private _inputChannels = signal<Nomenclature[]>([]);
  private _leadStatus = signal<Nomenclature[]>([]);
  private _users = signal<User[]>( [] );

  public leads = computed( () => this._leads() );
  public leadToAssignAdvisor = computed( () => this._leadToAssignAdvisor() );
  public leadIndicators = computed( () => this._leadIndicators() );

  public identityDocuments = computed( () => this._identityDocuments() );
  public personTypes = computed( () => this._personTypes() );
  public inputChannels = computed( () => this._inputChannels() );
  public leadStatus = computed( () => this._leadStatus() );
  public users = computed( () => this._users() );
  public allowList = computed( () => this._allowList() );
  public isReadOnly = computed( () => this._isReadOnly() );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public isJuridicPerson = computed( () => this._isJuridicPerson() );
  public totalLeads = computed( () => this._totalLeads() );

  get isFormInvalid() { return this.leadForm.invalid; }
  get isFormInvalidAssign() { return this.assignAdvisorForm.invalid; }
  get leadBody(): LeadBody { return  this.leadForm.value as LeadBody; }
  get assignAdvisorBody(): { id: string; adviserUserId: string } {
    return  this.assignAdvisorForm.value as { id: string; adviserUserId: string };
  }
  get isInvalidSearchInput() { return this.searchInput.invalid; }

  inputErrors( field: string ) {
    return this.leadForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.leadForm.errors; }

  isTouched( field: string ) {
    return this.leadForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    initFlowbite();
    this.onListenAuthRx();
    this.onGetSelectsData();
    this.onGetUsers();
    this.onGetLeads();
  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetSelectsData() {

    forkJoin({
      inputChannelResponse: this._nomenclatureService.getInputChannel(),
      leadStatusResponse: this._nomenclatureService.getLeadStatus(),
      personTypesResponse: this._nomenclatureService.getPersonType(),
      identityDocumentsResponse: this._identityDocService.getIdentityDocuments()
    }).subscribe( ({ inputChannelResponse, leadStatusResponse, personTypesResponse, identityDocumentsResponse }) => {

      const { identityDocuments } = identityDocumentsResponse;
      const { nomenclatures: personTypes } = personTypesResponse;
      const { nomenclatures: inputsChannel } = inputChannelResponse;
      const { nomenclatures: leadStatus } = leadStatusResponse;

      this._identityDocuments.set( identityDocuments );
      this._inputChannels.set( inputsChannel );
      this._leadStatus.set( leadStatus );
      this._personTypes.set( personTypes );

    } );

  }

  onGetUsers() {
    const pattern = this.searchUserInput.value ?? '';
    this._userService.getUsers( 1, pattern, 10 )
    .subscribe( ( { users } ) => {
      this._users.set( users );
      this.searchUserInput.reset();
    });
  }

  onGetLeads( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiLead && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );

    forkJoin({
      listLeadResponse: this._leadService.getLeads( page, filter ),
      indicatorsResponse: this._leadService.getIndicators()
    })
    .subscribe( ({ listLeadResponse, indicatorsResponse }) => {

      const { leads, total } = listLeadResponse;

      this._leadIndicators.set( indicatorsResponse );
      this._totalLeads.set( total );
      this._leads.set( leads );
      this._isLoading.set( false );

    });

  }

  onResetAfterSubmit() {
    this.leadModalTitle = 'Crear nuevo Lead (cliente potencial)';
    this.leadForm.reset();
    this._isSaving.set( false );
    this._isReadOnly.set( false );
  }

  onLoadToUpdate( lead: Lead, isReadOnly = false ) {

    const { id } = lead;

    this._alertService.showLoading();

    this._leadService.getLeadById( id )
    .subscribe( (lead) => {

      const { identityDocument, personType, userCreate, isActive, createAt, assignedAdvisor, admissionDate, ...rest } = lead;

      this.onChangePersonType( personType );
      this.onChangeIdentityDocument( identityDocument );

      this.leadForm.reset({
        ...rest,
        personType,
        identityDocumentId: identityDocument?.id,
        adviserUserId: assignedAdvisor?.id,
        admissionDate: moment( admissionDate ).format('YYYY-MM-DD')
      });

      this.leadForm.markAllAsTouched();

      this._isReadOnly.set( isReadOnly );

      this.leadModalTitle = 'Actualizar nuevo Lead (cliente potencial)';
      if( isReadOnly ) {
        this.leadModalTitle = 'Lead (cliente potencial)';
      }

      this.btnShowLeadModal.nativeElement.click();
      this._alertService.close();

    } );

  }

  onLoadToAssignAdvisor( lead: Lead ) {
    const { id } = lead;

    this._alertService.showLoading();

    this._leadService.getLeadById( id )
    .subscribe( (lead) => {

      const { assignedAdvisor } = lead;

      this._leadToAssignAdvisor.set( lead );

      this.assignAdvisorForm.reset({
        id,
        adviserUserId: assignedAdvisor?.id,
      });

      this.assignAdvisorForm.markAllAsTouched();

      this.btnShowAssignAdvisorModal.nativeElement.click();
      this.searchUserInput.reset();
      this.onGetUsers();

      this._alertService.close();


    } );
  }

  onChangePersonType( personType: PersonType ) {

    this._isJuridicPerson.set( personType == PersonType.JuridicPerson );

    this.leadForm.get('name')?.clearValidators();
    this.leadForm.get('surname')?.clearValidators();
    this.leadForm.get('bussinessName')?.clearValidators();

    if( personType == PersonType.JuridicPerson ) {

      this.leadForm.get('bussinessName')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 6 ),
       ] );

    } else {

      this.leadForm.get('name')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 3 ),
      ] );

      this.leadForm.get('surname')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 3 ),
      ] );
    }

    this.leadForm.get('name')?.updateValueAndValidity();
    this.leadForm.get('surname')?.updateValueAndValidity();
    this.leadForm.get('bussinessName')?.updateValueAndValidity();

  }

  async onConvertConfirm( lead: Lead ) {

    const responseConfirm = await this._alertService.showConfirmAlert(
      'Convertir Lead en un Cliente',
      `¿Está seguro de convertir Lead: "${ lead.fullname }", en un cliente?`
    );

    if( responseConfirm.isConfirmed ) {
      this._onConvertToClient( lead.id );
    }

  }

  private _onConvertToClient( leadId: string ) {
    this._leadService.convertLeadToClient( leadId )
    .subscribe( (leadConverted) => {
      this._alertService.showAlert(`Lead convertido en cliente exitosamente`, undefined, 'success');

      this.onGetLeads();
    });
  }

  onChangeIdentityDocument( identityDocument?: IdentityDocument ) {

    if( !identityDocument ) return;

    const { longitude, isAlphaNumeric, isLongitudeExact } = identityDocument;

    this.leadForm.get('identityNumber')?.clearValidators();
    this.leadForm.get('identityNumber')?.addValidators( [
      Validators.required,
      Validators.pattern( isAlphaNumeric ? numberDocumentPatt : numberPatt ),
      Validators.minLength( isLongitudeExact ? longitude : 6 ),
      Validators.maxLength( longitude ),
     ] );

    this.leadForm.updateValueAndValidity();
  }

  onSubmit() {

    this.leadForm.markAllAsTouched();

    if( this.isFormInvalid || this._isSaving() ) return;

    const { id = 'xD', ...body } = this.leadBody;

    if( !ISUUID( id ) ) {

      const allowCreate = this._webUrlPermissionMethods.some(
        (permission) => permission.webApi == apiLead && permission.methods.includes( 'POST' )
      );

      if( !allowCreate ) {
        this._alertService.showAlert( undefined, 'No tiene permiso para crear un Lead', 'warning');
        return;
      }

      this._isSaving.set( true );

      this._leadService.createLead( body )
      .subscribe({
        next: async ( leadCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseLeadModal.nativeElement.click();
          this.onGetLeads();

          this._alertService.showAlert('Lead creado exitosamente', undefined, 'success');
          this._isSaving.set( false );

        }, error: (err) => {

          this._isSaving.set( false );
        }
      });
      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiLead && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un Lead', 'warning');
      return;
    }

    this._isSaving.set( true );

    this._leadService.updateLead( id, body )
    .subscribe({
      next: async ( leadUpdated ) => {

        this.onResetAfterSubmit();
        this.btnCloseLeadModal.nativeElement.click();
        this.onGetLeads();
        this._isSaving.set( false );

        this._alertService.showAlert('Lead actualizado exitosamente', undefined, 'success');

      }, error: (err) => {

        this._isSaving.set( false );
      }
    });

  }

  onAssignAdvisorSubmit() {

    if( this.isFormInvalidAssign || this._isSaving() ) {
      this.assignAdvisorForm.markAllAsTouched();
      return;
    };

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiLead && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un Lead', 'warning');
      return;
    }

    this._isSaving.set( true );

    this._leadService.assignAdvisor( this.assignAdvisorBody )
    .subscribe({
      next: async ( leadUpdated ) => {

        this.assignAdvisorForm.reset();
        this.btnCloseAssignAdvisorModal.nativeElement.click();
        this.onGetLeads();
        this._isSaving.set( false );

        this._alertService.showAlert('Lead actualizado exitosamente', undefined, 'success');

      }, error: (err) => {

        this._isSaving.set( false );
      }
    });


  }

  ngOnDestroy(): void {
    this._authrx$?.unsubscribe();
  }

}
