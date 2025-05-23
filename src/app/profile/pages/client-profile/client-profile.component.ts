import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { validate as ISUUID } from 'uuid';

import ClientIndicatorsComponent from '../../components/client-indicators/client-indicators.component';
import { ProfileService } from '../../services/profile.service';
import { Client, ClientBody, ClientStatus, PersonType } from '../../../modules/admin/interfaces';
import { emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, phonePatt } from '@shared/helpers/regex.helper';
import { environments } from '@envs/environments';
import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { IdentityDocument } from '../../../auth/interfaces';
import { Nomenclature } from '@shared/interfaces';
import { forkJoin } from 'rxjs';
import { IdentityDocumentService } from '../../../modules/admin/services/identity-document.service';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { ClientService } from '../../../modules/admin/services/client.service';
import { AlertService } from '@shared/services/alert.service';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { ClientValidatorService } from '../../../modules/admin/validators/client-validator.service';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ClientIndicatorsComponent,
    PipesModule,
    PaginationComponent,
    NgSelectModule,
    FlatpickrDirective,
    SpinnerComponent,
    InputErrorsDirective
  ],
  templateUrl: './client-profile.component.html',
  styles: ``
})
export default class ClientProfileComponent implements OnInit {

  private _alertService = inject( AlertService );
  private _clientValidatorService = inject( ClientValidatorService );
  private _profileService = inject( ProfileService );
  private _identityDocService = inject( IdentityDocumentService );
  private _nomenclatureService = inject( NomenclatureService );
  private _clientService = inject( ClientService );

  @ViewChild('btnCloseClientModal') btnCloseClientModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowClientModal') btnShowClientModal!: ElementRef<HTMLButtonElement>;

  public clientModalTitle = 'Crear nuevo cliente';

  maxBirthDate: Date = new Date(2005, 12, 31 );

  private _userSellerId = '';

  private _formBuilder = inject( UntypedFormBuilder );
  public clientForm = this._formBuilder.group({
    id:                   [ '', [] ],
    name:                 [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    surname:              [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    bussinessName:        [ '', [ Validators.pattern( fullTextPatt ) ] ],
    personType:           [ null, [ Validators.required ] ],
    identityDocumentId:   [ null, [ Validators.required ] ],
    identityNumber:       [ '', [ Validators.required, Validators.pattern( numberDocumentPatt ) ] ],
    birthDate:            [ '', [ Validators.required ] ],
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

  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _civilStatus = signal<Nomenclature[]>([]);
  private _genders = signal<Nomenclature[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);
  private _isJuridicPerson = signal( false );
  private _isSaving = signal( false );

  public identityDocuments = computed( () => this._identityDocuments() );
  public civilStatus = computed( () => this._civilStatus() );
  public genders = computed( () => this._genders() );
  public personTypes = computed( () => this._personTypes() );
  public isJuridicPerson = computed( () => this._isJuridicPerson() );
  public isSaving = computed( () => this._isSaving() );

  private _totalClients = signal<number>( 0 );
  private _clients = signal<Client[]>( [] );
  private _isLoading = signal( true );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  public defaultImg = environments.defaultImgUrl;

  public readonly FINALIZED = ClientStatus.Finalized;
  public readonly PENDING = ClientStatus.Pending;
  public readonly NOT_FINALIZED = ClientStatus.NotFinalized;

  public clients = computed( () => this._clients() );
  public totalClients = computed( () => this._totalClients() );
  public isLoading = computed( () => this._isLoading() );

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

    this._userSellerId = localStorage.getItem('userProfileId') ?? '';

    if( !ISUUID( this._userSellerId ) )
      throw new Error('userProfileId not found !!!');

    this.onGetMyClients();
    this.onGetSelectsData();

  }

  onGetMyClients( page = 1 ) {

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._profileService.getMyClients( page, filter, 5, this._userSellerId )
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

      this._identityDocuments.set( identityDocuments );
      this._civilStatus.set( civilStatus );
      this._genders.set( genders );
      this._personTypes.set( personTypes );

    } );

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
      this.clientModalTitle = 'Actualizar Cliente';

      this.btnShowClientModal.nativeElement.click();
      this._alertService.close();

    } );

  }

  onSubmit() {

    this.clientForm.markAllAsTouched();

    if( this.isFormInvalid || this._isLoading() ) return;

    const { id = 'xD', ...body } = this.clientBody;

    if( !ISUUID( id ) ) {

      // const allowCreate = this._webUrlPermissionMethods.some(
      //   (permission) => permission.webApi == apiClient && permission.methods.includes( 'POST' )
      // );

      // if( !allowCreate ) {
      //   this._alertService.showAlert( undefined, 'No tiene permiso para crear un cliente', 'warning');
      //   return;
      // }

      this._isLoading.set( true );

      this._clientService.createClient( body )
      .subscribe({
        next: async ( clientCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseClientModal.nativeElement.click();
          this.onGetMyClients();

          this._alertService.showAlert('Cliente creado exitosamente', undefined, 'success');
          // this._isLoading.set( false );

        }, error: (err) => {

          this._isLoading.set( false );
        }
      });
      return;
    }

    // const allowUpdate = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiClient && permission.methods.includes( 'PATCH' )
    // );

    // if( !allowUpdate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un cliente', 'warning');
    //   return;
    // }

    this._isLoading.set( true );

    this._clientService.updateClient( id, body )
    .subscribe({
      next: async ( clientUpdated ) => {

        this.onResetAfterSubmit();
        this.btnCloseClientModal.nativeElement.click();
        this.onGetMyClients();
        this._isLoading.set( false );

        this._alertService.showAlert('Cliente actualizado exitosamente', undefined, 'success');

      }, error: (err) => {

        this._isLoading.set( false );
      }
    });

  }

}
