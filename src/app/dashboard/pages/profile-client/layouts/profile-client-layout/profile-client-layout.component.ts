import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { validate as ISUUID } from 'uuid';

import * as clientProfileactions from '@redux/actions/profile-client.actions';
import * as autheactions from '@redux/actions/auth.actions';
import { Client, ClientBody, ClientStatus, Department, District, IdentityDocument, PersonType, Province } from '@modules/admin/interfaces';
import { ClientService } from '@modules/admin/services/client.service';
import { AppState } from '@app/app.config';
import { AuthService } from '@app/auth/services/auth.service';
import { firstValueFrom, forkJoin, Subscription } from 'rxjs';
import { AuthState } from '@redux/reducers';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { IdentityDocumentService } from '@modules/admin/services/identity-document.service';
import { UbigeoService } from '@modules/admin/services/ubigeo.service';
import { Nomenclature } from '@shared/interfaces';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, phonePatt } from '@shared/helpers/regex.helper';
import { ClientValidatorService } from '@modules/admin/validators/client-validator.service';
import { AlertService } from '@shared/services/alert.service';

@Component({
  templateUrl: './profile-client-layout.component.html',
  styles: ``
})
export class ProfileClientLayoutComponent implements OnInit, OnDestroy {

  @ViewChild('btnCloseClientModal') btnCloseClientModal!: ElementRef<HTMLButtonElement>;

  private _authRx$?: Subscription;

  private _clientProfileId = '';
  maxBirthDate: Date = new Date(2005, 12, 31 );
  private _alertService = inject( AlertService );
  private _clientService = inject( ClientService );
  private _store = inject( Store<AppState> );

  private _nomenclatureService = inject( NomenclatureService );
  private _ubigeoService = inject( UbigeoService );
  private _identityDocService = inject( IdentityDocumentService );
  private _clientValidatorService = inject( ClientValidatorService );

  public readonly FINALIZED = ClientStatus.Finalized;
  public readonly PENDING = ClientStatus.Pending;
  public readonly NOT_FINALIZED = ClientStatus.NotFinalized;

  private _formBuilder = inject( UntypedFormBuilder );

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

  private _client = signal<Client | null>( null );
  private _isLoading = signal<boolean>( false );
  private _isSaving = signal( false );
  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _departments = signal<Department[]>([]);
  private _provinces = signal<Province[]>([]);
  private _districts = signal<District[]>([]);
  private _civilStatus = signal<Nomenclature[]>([]);
  private _genders = signal<Nomenclature[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);

  public client = computed( () => this._client() );
  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );

  public identityDocuments = computed( () => this._identityDocuments() );
  public departments = computed( () => this._departments() );
  public provinces = computed( () => this._provinces() );
  public districts = computed( () => this._districts() );
  public civilStatus = computed( () => this._civilStatus() );
  public genders = computed( () => this._genders() );
  public personTypes = computed( () => this._personTypes() );

  private _isJuridicPerson = signal<boolean>( false );
  public isJuridicPerson = computed( () => this._isJuridicPerson() );

  get clientBody(): ClientBody { return  this.clientForm.value as ClientBody; }

  get isFormInvalid() { return this.clientForm.invalid; }

  inputErrors( field: string ) {
    return this.clientForm.get(field)?.errors ?? null;
  }

  isTouched( field: string ) {
    return this.clientForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    this.onListenAuthRx();
    this.onGetSelectsData();
  }

  onListenAuthRx() {
    this._authRx$ = this._store.select('auth')
    .subscribe( (state: AuthState) => {

      const { userAuthenticated } = state;

      if ( userAuthenticated ) {

        const { client } = userAuthenticated;

        if ( client ) {

          this._clientProfileId = client.id;
          this.onGetClientProfile();

        } else {
          this._authRx$?.unsubscribe();
          throw new Error('Client not found!!!');
        }

      } else {
        this._authRx$?.unsubscribe();
      }

    });
  }

  onGetClientProfile() {

    this._isLoading.set( true );

    this._store.dispatch( clientProfileactions.onLoadClientProfileInProgress() );

    this._clientService.getClientById( this._clientProfileId )
    .subscribe( (client) => {

      this._client.set( client );
      this._store.dispatch( clientProfileactions.onLoadClientProfile( { client } ) );
      this._isLoading.set( false );
    });
  }

  onGetSelectsData() {

    forkJoin({
      gendersResponse: this._nomenclatureService.getGender(),
      civilStatusResponse: this._nomenclatureService.getCivilStatus(),
      personTypesResponse: this._nomenclatureService.getPersonType(),
      identityDocumentsResponse: this._identityDocService.getIdentityDocuments(),
      departmentResponse: this._ubigeoService.getDepartments(),
    }).subscribe( ({ identityDocumentsResponse, personTypesResponse, civilStatusResponse, gendersResponse, departmentResponse }) => {

      const { identityDocuments } = identityDocumentsResponse;
      const { nomenclatures: personTypes } = personTypesResponse;
      const { nomenclatures: civilStatus } = civilStatusResponse;
      const { nomenclatures: genders } = gendersResponse;
      const { departments } = departmentResponse;

      // this._identityDocumentsAll.set( identityDocuments );
      this._identityDocuments.set( identityDocuments );
      this._civilStatus.set( civilStatus );
      this._genders.set( genders );
      this._personTypes.set( personTypes );
      this._departments.set( departments );

    } );

  }

  onGetProvinces( department: Department ) {

    this._ubigeoService.getProvinces( department.code )
    .subscribe( ({ provinces }) => {
      this._provinces.set( provinces )
    });

  }

  onGetDistricts( province: Province ) {

    const { id = 'xD', departmentCode = '' } = this.clientBody;

    this._ubigeoService.getDistricts( departmentCode, province.code )
    .subscribe( ({ districts }) => {
      this._districts.set( districts );
    });

  }

  onResetAfterSubmit() {
    this.clientForm.reset();
    this._provinces.set( [] );
    this._districts.set( [] );
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

  onLoadToUpdate( ) {

    if(!ISUUID( this._clientProfileId )) {
      throw new Error('Client ID is not valid');
    }

    this.clientForm.get('id')?.setValue( this._clientProfileId );

    this._alertService.showLoading();

    this._clientService.getClientById( this._clientProfileId )
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

      this._alertService.close();

    } );

  }

  onSubmit() {

    this._isSaving.set( true );

    const { id = 'xD',departmentCode, provinceCode, ...body } = this.clientBody;

    this._clientService.updateClient( id, body )
    .subscribe({
      next: async ( clientUpdated ) => {

        this.onResetAfterSubmit();
        this.btnCloseClientModal.nativeElement.click();

        this._alertService.showAlert('Datos actualizados exitosamente', undefined, 'success');
        this._store.dispatch( autheactions.onRefreshClientInfo( { clientInfo: clientUpdated } ) );
        this._client.set( clientUpdated );

        this._isSaving.set( false );

      }, error: (err) => {

        this._isSaving.set( false );
      }
    });

  }

  ngOnDestroy(): void {
    this._store.dispatch( clientProfileactions.onResetClientProfile() );
    this._authRx$?.unsubscribe();
  }

}
