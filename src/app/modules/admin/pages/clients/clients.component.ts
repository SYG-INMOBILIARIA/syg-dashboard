import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom, forkJoin } from 'rxjs';
import { Store } from '@ngrx/store';
import { initFlowbite } from 'flowbite';
import { validate as ISUUID } from 'uuid';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrDirective } from 'angularx-flatpickr';

import { AlertService } from '@shared/services/alert.service';
import { emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, passwordPatt, phonePatt } from '@shared/helpers/regex.helper';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { PipesModule } from '@pipes/pipes.module';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { Nomenclature } from '@shared/interfaces';
import { AppState } from '@app/app.config';
import { apiClient } from '@shared/helpers/web-apis.helper';
import { UbigeoService } from '@modules/admin/services/ubigeo.service';
import { ClientService } from '../../services/client.service';
import { Client, ClientBody, Department, District, IdentityDocument, PersonType, Province } from '../../interfaces';
import { IdentityDocumentService } from '../../services/identity-document.service';
import { Role, WebUrlPermissionMethods } from '../../../../auth/interfaces';
import { ClientValidatorService } from '../../validators/client-validator.service';
import { RoleService } from '@modules/security/services/role.service';
import { oneLowercaseInPassword, oneUppercaseInPassword } from '@modules/admin/validators/password-valdiator.service';
import { CredentialsBody } from '../../interfaces/credentials-body.interface';

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
    FlatpickrDirective,
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
  @ViewChild('btnShowCredentialsModal') btnShowCredentialsModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnCloseCredentialsModal') btnCloseCredentialsModal!: ElementRef<HTMLButtonElement>;

  public clientModalTitle = 'Crear nuevo cliente';

  maxBirthDate: Date = new Date(2005, 12, 31 );

  private _router = inject( Router );
  private _clientService = inject( ClientService );
  private _ubigeoService = inject( UbigeoService );
  private _clientValidatorService = inject( ClientValidatorService );
  private _identityDocService = inject( IdentityDocumentService );
  private _nomenclatureService = inject( NomenclatureService );
  private _alertService = inject( AlertService );
  private _formBuilder = inject( UntypedFormBuilder );
  private _roleService = inject( RoleService );
  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _isJuridicPerson = signal( false );
  private _isSavingCredentials = signal( false );
  showPassword =  false;
  showConfirmPassword = false;
  private _allowList = signal( true );
  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public departmentInput = new FormControl( null, []);
  public provinceInput = new FormControl( null, []);
  public districtInput = new FormControl( null, []);

  public clientForm = this._formBuilder.group({
    id:                   [ '', [] ],
    name:                 [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    surname:              [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    bussinessName:        [ '', [ Validators.pattern( fullTextPatt ) ] ],
    legalRepresentative:  [ '', [ Validators.pattern( fullTextPatt ) ] ],
    personType:           [ null, [ Validators.required ] ],
    identityDocumentId:   [ null, [ Validators.required ] ],
    identityNumber:       [ '', [ Validators.required, Validators.pattern( numberDocumentPatt ) ] ],
    birthDate:            [ null, [] ],
    email:                [ null, [ Validators.pattern( emailPatt ) ] ],
    phone:                [ null, [ Validators.pattern( phonePatt ) ] ],
    secondaryPhone:       [ '', [ Validators.pattern( phonePatt ) ] ],
    address:              [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    gender:               [ null, [ Validators.required ] ],
    civilStatus:          [ null, [ Validators.required ] ],

    departmentCode:       [ null, [ Validators.required ] ],
    provinceCode:         [ null, [ Validators.required ] ],
    districtId:           [ null, [ Validators.required ] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._clientValidatorService ],
  });

  public credentialsForm = this._formBuilder.group({
    username:         [ '', [ Validators.required, Validators.pattern( emailPatt ) ] ],
    password:         [ '', [ Validators.required, Validators.pattern( passwordPatt ), Validators.minLength( 8 ), oneUppercaseInPassword(), oneLowercaseInPassword() ] ],
    confirmPassword:  [ '', [ Validators.required ] ],
    rolesId:          [ [], [ Validators.required, Validators.minLength( 1 ) ] ],
  });

  private _totalClients = signal<number>( 0 );

  private _filter = '';
  private _isRemoving = false;
  private _clients = signal<Client[]>( [] );
  private _roles = signal<Role[]>( [] );
  private _selectedClient = signal<Client | null>( null );

  // private _identityDocumentsAll = signal<IdentityDocument[]>([]);
  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _departments = signal<Department[]>([]);
  private _provinces = signal<Province[]>([]);
  private _provincesToFilter = signal<Province[]>([]);
  private _districts = signal<District[]>([]);
  private _districtsToFilter = signal<District[]>([]);
  private _civilStatus = signal<Nomenclature[]>([]);
  private _genders = signal<Nomenclature[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);

  public clients = computed( () => this._clients() );

  public identityDocuments = computed( () => this._identityDocuments() );
  public roles = computed( () => this._roles() );
  public selectedClient = computed( () => this._selectedClient() );
  public departments = computed( () => this._departments() );
  public provinces = computed( () => this._provinces() );
  public provincesToFilter = computed( () => this._provincesToFilter() );
  public districts = computed( () => this._districts() );
  public districtsToFilter = computed( () => this._districtsToFilter() );
  public civilStatus = computed( () => this._civilStatus() );
  public genders = computed( () => this._genders() );
  public personTypes = computed( () => this._personTypes() );
  public allowList = computed( () => this._allowList() );
  public isSavingCredentials = computed( () => this._isSavingCredentials() );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public isJuridicPerson = computed( () => this._isJuridicPerson() );
  public totalClients = computed( () => this._totalClients() );

  get isFormInvalid() { return this.clientForm.invalid; }
  get isCredentialsFormInvalid(){ return this.credentialsForm.invalid; }
  get clientBody(): ClientBody { return  this.clientForm.value as ClientBody; }
  get credentialsBody(): CredentialsBody { return  this.credentialsForm.value as CredentialsBody; }
  get isInvalidSearchInput() { return this.searchInput.invalid; }

  get errorsCredentials() { return this.credentialsForm.getError; }

  inputErrors( field: string ) {
    return this.clientForm.get(field)?.errors ?? null;
  }

  inputErrorsCredentials( field: string ) {
    return this.credentialsForm.get(field)?.errors ?? null;
  }

  get errorLengthPassword() {
    const errorsPassword = this.credentialsForm.get('password')?.errors ?? [];
    const errors = Object.keys( errorsPassword );

    return errors.includes('minlength');
  }

  get errorUppercasePassword() {
    const errorsPassword = this.credentialsForm.get('password')?.errors ?? [];
    const errors = Object.keys( errorsPassword );

    return errors.includes('oneUpperCase');
  }

  get errorLowercasePassword() {
    const errorsPassword = this.credentialsForm.get('password')?.errors ?? [];
    const errors = Object.keys( errorsPassword );

    return errors.includes('oneLowercase');
  }

  get errorNumberPassword() {
    const errorsPassword = this.credentialsForm.get('password')?.errors ?? [];
    const errors = Object.keys( errorsPassword );

    return errors.includes('oneNumber');
  }


  get formErrors() { return this.clientForm.errors; }

  get credentialsFormErrors() { return this.credentialsForm.errors; }

  isTouched( field: string ) {
    return this.clientForm.get(field)?.touched ?? false;
  }

  isTouchedCredentials( field: string ) {
    return this.credentialsForm.get(field)?.touched ?? false;
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

    const dptCode = this.departmentInput.value ?? null;
    const provCode = this.provinceInput.value ?? null;
    const distCode = this.districtInput.value ?? null;

    this._isLoading.set( true );
    this._alertService.showLoading();
    this._clientService.getClients( page, this._filter, 10, false, dptCode, provCode, distCode )
    .subscribe({
      next: ({ clients, total }) => {

        this._totalClients.set( total );
        this._clients.set( clients );
        this._isLoading.set( false );
        this._alertService.close();

      }, error: (err) => {
        this._isLoading.set( false );
        this._alertService.close();
      }
    });

  }

  onGetProvinces( department: Department ) {

    this._ubigeoService.getProvinces( department.code )
    .subscribe( ({ provinces }) => {
      this._provinces.set( provinces )
    });

  }

  onGetProvincesToFilter( department: Department ) {

    this._ubigeoService.getProvinces( department.code )
    .subscribe( ({ provinces }) => {
      this._provincesToFilter.set( provinces )
    });

  }

  onGetDistricts( province: Province ) {

    const { id = 'xD', departmentCode = '' } = this.clientBody;

    this._ubigeoService.getDistricts( departmentCode, province.code )
    .subscribe( ({ districts }) => {
      this._districts.set( districts );
    });

  }

  onGetDistrictsToFilter( province: Province ) {

    const departmentCode = this.departmentInput.value ?? '';

    this._ubigeoService.getDistricts( departmentCode, province.code )
    .subscribe( ({ districts }) => {
      this._districtsToFilter.set( districts );
    });

  }

  onGetSelectsData() {

    forkJoin({

      gendersResponse: this._nomenclatureService.getGender(),
      civilStatusResponse: this._nomenclatureService.getCivilStatus(),
      personTypesResponse: this._nomenclatureService.getPersonType(),
      identityDocumentsResponse: this._identityDocService.getIdentityDocuments(),
      departmentResponse: this._ubigeoService.getDepartments(),
      rolesResponse: this._roleService.getRoles( 1, '', 100 ),
    }).subscribe( ({ identityDocumentsResponse, personTypesResponse, civilStatusResponse, gendersResponse, departmentResponse, rolesResponse }) => {

      const { identityDocuments } = identityDocumentsResponse;
      const { nomenclatures: personTypes } = personTypesResponse;
      const { nomenclatures: civilStatus } = civilStatusResponse;
      const { nomenclatures: genders } = gendersResponse;
      const { departments } = departmentResponse;
      const { roles } = rolesResponse;

      // this._identityDocumentsAll.set( identityDocuments );
      this._identityDocuments.set( identityDocuments );
      this._civilStatus.set( civilStatus );
      this._genders.set( genders );
      this._personTypes.set( personTypes );
      this._departments.set( departments );
      this._roles.set( roles );

    } );

  }

  onAddCredentials( client: Client ) {
    this._selectedClient.set( client );

    this.btnShowCredentialsModal.nativeElement.click();
  }

  onResetAfterSubmit() {
    this.clientModalTitle = 'Crear nuevo cliente';
    this.clientForm.reset();
    this._isSaving.set( false );
  }

  onResetAfterSubmitCredentials() {
    this.credentialsForm.reset();
    this._isSavingCredentials.set( false );
  }

  onLoadToUpdate( client: Client ) {

    const { id } = client;

    this._alertService.showLoading();

    this._clientService.getClientById( id )
    .subscribe( async (client) => {

      const { identityDocument, personType, userCreate, isActive, createAt, ubigeo, ...rest } = client;

      this.onChangePersonType( personType );

      if( identityDocument ) {
        this.onChangeIdentityDocument( identityDocument );
      }

      this.clientForm.reset({
        ...rest,
        personType,
        identityDocumentId: identityDocument?.id,

        departmentCode: ubigeo?.departmentCode,
        provinceCode: ubigeo?.provinceCode,
        districtId: ubigeo?.id,
      });

      if( ubigeo ) {

        const { provinces } = await firstValueFrom(
          this._ubigeoService.getProvinces( ubigeo.departmentCode )
        );

        const { districts } = await firstValueFrom(
          this._ubigeoService.getDistricts( ubigeo.departmentCode, ubigeo.provinceCode )
        );

        this._districts.set( districts );
        this._provinces.set( provinces );
      }


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
    this.clientForm.get('legalRepresentative')?.clearValidators();
    this.clientForm.get('gender')?.clearValidators();
    this.clientForm.get('civilStatus')?.clearValidators();

    if( personType == PersonType.JuridicPerson ) {

      this.clientForm.get('name')?.setValue('');
      this.clientForm.get('surname')?.setValue('');
      this.clientForm.get('gender')?.setValue(null);
      this.clientForm.get('civilStatus')?.setValue(null);

      this.clientForm.get('bussinessName')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 6 ),
      ] );

      this.clientForm.get('legalRepresentative')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 6 ),
      ] );

      this.clientForm.get('gender')?.clearValidators();
      this.clientForm.get('civilStatus')?.clearValidators();

    } else {

      this.clientForm.get('bussinessName')?.setValue('');
      this.clientForm.get('legalRepresentative')?.setValue('');

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

      this.clientForm.get('gender')?.addValidators( [ Validators.required ] );
      this.clientForm.get('civilStatus')?.addValidators( [ Validators.required ] );
    }

    this.clientForm.get('name')?.updateValueAndValidity();
    this.clientForm.get('surname')?.updateValueAndValidity();
    this.clientForm.get('bussinessName')?.updateValueAndValidity();
    this.clientForm.get('legalRepresentative')?.updateValueAndValidity();
    this.clientForm.get('gender')?.updateValueAndValidity();
    this.clientForm.get('civilStatus')?.updateValueAndValidity();

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

    this.clientForm.get('identityNumber')?.updateValueAndValidity();
  }

  onSubmit() {

    this.clientForm.markAllAsTouched();

    if( this.isFormInvalid || this._isSaving() ) return;

    const { id = 'xD',departmentCode, provinceCode, ...body } = this.clientBody;

    if( !ISUUID( id ) ) {

      const allowCreate = this._webUrlPermissionMethods.some(
        (permission) => permission.webApi == apiClient && permission.methods.includes( 'POST' )
      );

      if( !allowCreate ) {
        this._alertService.showAlert( undefined, 'No tiene permiso para crear un cliente', 'warning');
        return;
      }

      this._isSaving.set( true );

      this._clientService.createClient( body )
      .subscribe({
        next: async ( clientCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseClientModal.nativeElement.click();
          this.onGetClients();

          this._alertService.showAlert('Cliente creado exitosamente', undefined, 'success');

        }, error: (err) => {

          this._isSaving.set( false );
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

    this._isSaving.set( true );

    this._clientService.updateClient( id, body )
    .subscribe({
      next: async ( clientUpdated ) => {

        this.onResetAfterSubmit();
        this.btnCloseClientModal.nativeElement.click();
        this.onGetClients();

        this._alertService.showAlert('Cliente actualizado exitosamente', undefined, 'success');

      }, error: (err) => {

        this._isSaving.set( false );
      }
    });

  }

  onSubmitCredentials() {

    console.log( this.errorsCredentials );

    this.credentialsForm.markAllAsTouched();

    if( this.isCredentialsFormInvalid || this._isSavingCredentials() ) return;

    const allowCreate = this._webUrlPermissionMethods.some(
      (permission) => permission.webApi == apiClient && permission.methods.includes( 'POST' )
    );

    if( !allowCreate ) {
      this._alertService.showAlert( undefined, 'No tiene permiso para crear credenciales', 'warning');
      return;
    }

    this._isSavingCredentials.set( true );

    const { id: clientId = '', identityDocument, identityNumber, name, surname, email = '' } = this.selectedClient() ?? {};

    const body = {
      ...this.credentialsBody,
      identityDocumentId: identityDocument?.id,
      identityNumber,
      name,
      surname,
      email: email == null || email == '' ? this.credentialsBody.username : email,
    };

    this._clientService.createCredentials( clientId, body )
    .subscribe({
      next: async ( clientCreated ) => {

        this.onResetAfterSubmit();
        this.btnCloseCredentialsModal.nativeElement.click();
        this.onGetClients();

        this._alertService.showAlert('Credenciales creadas exitosamente', undefined, 'success');

      }, error: (err) => {

        this._isSavingCredentials.set( false );
      },
      complete: () => {
        this._isSavingCredentials.set( false );
      }
    });


  }

  onNagivateToProfile( client: Client ) {
    localStorage.setItem('clientProfileId', client.id);

    const fullnameSanitize = client.fullname
                                .replaceAll(' ', '-')
                                .replaceAll(',', '-')
                                .toUpperCase();

    this._router.navigateByUrl(`/dashboard/client-profile/info/${ fullnameSanitize }`)
  }

  ngOnDestroy(): void {
      this._authrx$?.unsubscribe();
  }

}
