import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { Subscription, forkJoin } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';
import { validate as ISUUID } from 'uuid';
import { Store } from '@ngrx/store';
import { FlatpickrDirective } from 'angularx-flatpickr';


import { ClientService } from '../../services/client.service';
import { Client, ClientBody, IdentityDocument, PersonType } from '../../interfaces';
import { AlertService } from '@shared/services/alert.service';
import { emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, phonePatt } from '@shared/helpers/regex.helper';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { PipesModule } from '@pipes/pipes.module';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { IdentityDocumentService } from '../../services/identity-document.service';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { Nomenclature } from '@shared/interfaces';
import { AppState } from '../../../../app.config';
import { WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { apiClient } from '@shared/helpers/web-apis.helper';
import { ClientValidatorService } from '../../validators/client-validator.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    InputErrorsDirective,
    PaginationComponent,
    PipesModule,
    NgSelectModule,
    FlatpickrDirective
  ],
  templateUrl: './clients.component.html',
  styles: ``
})
export default class ClientsComponent implements OnInit, OnDestroy {

  private _authrx$?: Subscription;
  private _store = inject<Store<AppState>>( Store<AppState> );
  private _webUrlPermissionMethods: WebUrlPermissionMethods[] = [];

  @ViewChild('btnCloseClientModal') btnCloseClientModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowClientModal') btnShowClientModal!: ElementRef<HTMLButtonElement>;

  public clientModalTitle = 'Crear nuevo cliente';

  maxBirthDate: Date = new Date(2005, 12, 31 );

  private _clientService = inject( ClientService );
  private _clientValidatorService = inject( ClientValidatorService );
  private _identityDocService = inject( IdentityDocumentService );
  private _nomenclatureService = inject( NomenclatureService );
  private _alertService = inject( AlertService );
  private _formBuilder = inject( UntypedFormBuilder );
  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isJuridicPerson = signal( false );
  private _allowList = signal( true );
  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public clientForm = this._formBuilder.group({
    id:                   [ '', [] ],
    name:                 [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    surname:              [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    bussinessName:        [ '', [ Validators.pattern( fullTextPatt ) ] ],
    personType:           [ null, [ Validators.required ] ],
    identityDocumentId:   [ null, [ Validators.required ] ],
    identityNumber:       [ '', [ Validators.required, Validators.pattern( numberDocumentPatt ) ] ],
    birthDate:            [ '', [] ],
    email:                [ '', [ Validators.required, Validators.pattern( emailPatt ) ] ],
    phone:                [ '', [ Validators.required, Validators.pattern( phonePatt ) ] ],
    secondaryPhone:       [ '', [ Validators.pattern( phonePatt ) ] ],
    address:              [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    gender:               [ null, [ Validators.required ] ],
    civilStatus:          [ null, [ Validators.required ] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._clientValidatorService ],
  });

  private _totalClients = signal<number>( 0 );

  private _filter = '';
  private _isRemoving = false;
  private _clients = signal<Client[]>( [] );

  // private _identityDocumentsAll = signal<IdentityDocument[]>([]);
  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _civilStatus = signal<Nomenclature[]>([]);
  private _genders = signal<Nomenclature[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);

  public clients = computed( () => this._clients() );

  public identityDocuments = computed( () => this._identityDocuments() );
  public civilStatus = computed( () => this._civilStatus() );
  public genders = computed( () => this._genders() );
  public personTypes = computed( () => this._personTypes() );
  public allowList = computed( () => this._allowList() );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public isJuridicPerson = computed( () => this._isJuridicPerson() );
  public totalClients = computed( () => this._totalClients() );

  get isFormInvalid() { return this.clientForm.invalid; }
  get clientBody(): ClientBody { return  this.clientForm.value as ClientBody; }
  get isInvalidSearchInput() { return this.searchInput.invalid; }

  inputErrors( field: string ) {
    return this.clientForm.get(field)?.errors ?? null;
  }

  get formErrors() { return this.clientForm.errors; }

  isTouched( field: string ) {
    return this.clientForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    initFlowbite();

    this.onListenAuthRx();
    this.onGetSelectsData();
    this.onGetClients( 1 );

  }

  onListenAuthRx() {
    this._authrx$ = this._store.select('auth')
    .subscribe( (state) => {
      const { webUrlPermissionMethods } = state;

      this._webUrlPermissionMethods = webUrlPermissionMethods;
    });
  }

  onGetClients( page = 1 ) {

    const allowList = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiClient && permission.methods.includes( 'GET' )
    );

    if( !allowList ) {
      this._allowList.set( false );
      return;
    }

    this._filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._clientService.getClients( page, this._filter )
    .subscribe({
      next: ({ clients, total }) => {

        this._totalClients.set( total );
        this._clients.set( clients );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onGetSelectsData() {

    forkJoin({

      gendersResponse: this._nomenclatureService.getGender(),
      civilStatusResponse: this._nomenclatureService.getCivilStatus(),
      personTypesResponse: this._nomenclatureService.getPersonType(),
      identityDocumentsResponse: this._identityDocService.getIdentityDocuments()

    }).subscribe( ({ identityDocumentsResponse, personTypesResponse, civilStatusResponse, gendersResponse }) => {

      const { identityDocuments } = identityDocumentsResponse;
      const { nomenclatures: personTypes } = personTypesResponse;
      const { nomenclatures: civilStatus } = civilStatusResponse;
      const { nomenclatures: genders } = gendersResponse;

      // this._identityDocumentsAll.set( identityDocuments );
      this._identityDocuments.set( identityDocuments );
      this._civilStatus.set( civilStatus );
      this._genders.set( genders );
      this._personTypes.set( personTypes );

    } );

  }

  onResetAfterSubmit() {
    this.clientModalTitle = 'Crear nuevo cliente';
    this.clientForm.reset();
    this._isSaving.set( false );
  }

  onLoadToUpdate( client: Client ) {

    const { id } = client;

    this._alertService.showLoading();

    this._clientService.getClientById( id )
    .subscribe( (client) => {

      const { identityDocument, personType, userCreate, isActive, createAt, ...rest } = client;

      this.onChangePersonType( personType );

      if( identityDocument ) {
        this.onChangeIdentityDocument( identityDocument );
      }

      this.clientForm.reset({
        ...rest,
        personType,
        identityDocumentId: identityDocument?.id
      });

      this.clientForm.markAllAsTouched();

      this.btnShowClientModal.nativeElement.click();
      this._alertService.close();

    } );

  }

  async onRemoveConfirm( client: Client ) {

    const responseConfirm = await this._alertService.showConfirmAlert(
      'Verifique que no haya un contrato asociado a este cliente',
      `¿Está seguro de eliminar cliente: "${ client.fullname }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._onRemoveClient( client.id );
    }

  }

  private _onRemoveClient( clientId: string ) {
    this._clientService.removeClient( clientId )
    .subscribe( (clientDeleted) => {
      this._alertService.showAlert(`Cliente eliminado exitosamente`, undefined, 'success');

      this.onGetClients();
    });
  }

  onChangePersonType( personType: PersonType ) {

    this._isJuridicPerson.set( personType == PersonType.JuridicPerson );

    this.clientForm.get('name')?.clearValidators();
    this.clientForm.get('surname')?.clearValidators();
    this.clientForm.get('bussinessName')?.clearValidators();

    if( personType == PersonType.JuridicPerson ) {

      this.clientForm.get('bussinessName')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 6 ),
       ] );

    } else {

      this.clientForm.get('name')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 3 ),
      ] );

      this.clientForm.get('surname')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 3 ),
      ] );
    }

    this.clientForm.updateValueAndValidity();

  }

  onChangeIdentityDocument( identityDocument: IdentityDocument ) {

    const { longitude, isAlphaNumeric, isLongitudeExact } = identityDocument;

    this.clientForm.get('identityNumber')?.clearValidators();
    this.clientForm.get('identityNumber')?.addValidators( [
      Validators.required,
      Validators.pattern( isAlphaNumeric ? numberDocumentPatt : numberPatt ),
      Validators.minLength( isLongitudeExact ? longitude : 6 ),
      Validators.maxLength( longitude ),
     ] );

    this.clientForm.updateValueAndValidity();
  }

  onSubmit() {

    this.clientForm.markAllAsTouched();

    if( this.isFormInvalid || this._isLoading() ) return;


    const { id = 'xD', ...body } = this.clientBody;

    if( !ISUUID( id ) ) {

      const allowCreate = this._webUrlPermissionMethods.some(
        (permission) => permission.webApi == apiClient && permission.methods.includes( 'POST' )
      );

      if( !allowCreate ) {
        this._alertService.showAlert( undefined, 'No tiene permiso para crear un cliente', 'warning');
        return;
      }

      this._isLoading.set( true );

      this._clientService.createClient( body )
      .subscribe({
        next: async ( clientCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseClientModal.nativeElement.click();
          this.onGetClients();

          this._alertService.showAlert('Cliente creado exitosamente', undefined, 'success');
          // this._isLoading.set( false );

        }, error: (err) => {

          this._isLoading.set( false );
        }
      });
      return;
    }

    const allowUpdate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiClient && permission.methods.includes( 'PATCH' )
    );

    if( !allowUpdate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un cliente', 'warning');
      return;
    }

    this._isLoading.set( true );

    this._clientService.updateClient( id, body )
    .subscribe({
      next: async ( clientUpdated ) => {

        this.onResetAfterSubmit();
        this.btnCloseClientModal.nativeElement.click();
        this.onGetClients();
        this._isLoading.set( false );

        this._alertService.showAlert('Cliente actualizado exitosamente', undefined, 'success');

      }, error: (err) => {

        this._isLoading.set( false );
      }
    });

  }

  ngOnDestroy(): void {
      this._authrx$?.unsubscribe();
  }

}
