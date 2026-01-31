import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';
import { validate as ISUUID } from 'uuid';

import { VisitorService } from './services/visitor.service';
import { Visitor, VisitorBody } from './interfaces';
import { emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, phonePatt } from '@shared/helpers/regex.helper';
import { VisitorValidatorService } from './services/visitor-validator.service';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { PipesModule } from '@pipes/pipes.module';
import { AlertService } from '@shared/services/alert.service';
import { IdentityDocument, PersonType } from '@modules/admin/interfaces';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { IdentityDocumentService } from '@modules/admin/services/identity-document.service';
import { Nomenclature } from '@shared/interfaces';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputErrorsDirective,
    PipesModule,
    PaginationComponent,
    NgSelectModule,
    SpinnerComponent
  ],
  templateUrl: './visitors.component.html',
  styles: ``
})
export default class VisitorsComponent implements OnInit {

  @ViewChild('btnShowVisitorModal') btnShowVisitorModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnCloseVisitorModal') btnCloseVisitorModal!: ElementRef<HTMLButtonElement>;

  private _visitorService = inject( VisitorService );
  private _alertService = inject( AlertService );
  private _nomenclatureService = inject( NomenclatureService );
  private _identityDocService = inject( IdentityDocumentService );

  private _visitortValidatorService = inject( VisitorValidatorService );

  private _listInProgress = signal<boolean>( false );
  private _saveInProgress = signal<boolean>( false );
  private _visitors = signal<Visitor[]>( [] );
  private _totalVisitors = signal<number>( 0 );
  private _allowList = signal( true );
  private _isJuridicPerson = signal( false );
  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _civilStatus = signal<Nomenclature[]>([]);
  private _genders = signal<Nomenclature[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);

  public listInProgress = computed( () => this._listInProgress() );
  public saveInProgress = computed( () => this._saveInProgress() );
  public visitors = computed( () => this._visitors() );
  public totalVisitors = computed( () => this._totalVisitors() );
  public allowList = computed( () => this._allowList() );
  public isJuridicPerson = computed( () => this._isJuridicPerson() );
  public identityDocuments = computed( () => this._identityDocuments() );
  public civilStatus = computed( () => this._civilStatus() );
  public genders = computed( () => this._genders() );
  public personTypes = computed( () => this._personTypes() );

  visitorModalTitle = 'Crear visitante';

  private _formBuilder = inject( UntypedFormBuilder );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public visitorForm = this._formBuilder.group({
    id:                   [ '', [] ],
    name:                 [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    surname:              [ '', [ Validators.required, Validators.pattern( fullTextPatt ) ] ],
    bussinessName:        [ '', [ Validators.pattern( fullTextPatt ) ] ],
    legalRepresentative:  [ '', [ Validators.pattern( fullTextPatt ) ] ],
    personType:           [ null, [ Validators.required ] ],
    identityDocumentId:   [ null, [ Validators.required ] ],
    identityNumber:       [ '', [ Validators.required, Validators.pattern( numberDocumentPatt ) ] ],
    email:                [ null, [ Validators.pattern( emailPatt ) ] ],
    phone:                [ null, [ Validators.pattern( phonePatt ) ] ],
    gender:               [ null, [ Validators.required ] ],
  }, {
    updateOn: 'change',
    asyncValidators: [ this._visitortValidatorService ],
  });

  get isFormInvalid() { return this.visitorForm.invalid; }
  get isInvalidSearchInput() { return this.searchInput.invalid; }
  get visitorBody() { return this.visitorForm.value as VisitorBody }

  inputErrors( field: string ) {
    return this.visitorForm.get(field)?.errors ?? null;
  }
  isTouched( field: string ) {
    return this.visitorForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {
    this.onGetVisitors();
    this.onGetSelectsData();
  }

  onGetVisitors( page = 1 ) {

    if( this._listInProgress() ) return;

    this._listInProgress.set( true );

    this._visitorService.getVisitors( page, '' )
    .subscribe( ({ visitors, total }) => {

      this._visitors.set( visitors );
      this._totalVisitors.set( total );
      this._listInProgress.set( false );

    } );

  }

  onGetSelectsData() {

    forkJoin({
      gendersResponse: this._nomenclatureService.getGender(),
      civilStatusResponse: this._nomenclatureService.getCivilStatus(),
      personTypesResponse: this._nomenclatureService.getPersonType(),
      identityDocumentsResponse: this._identityDocService.getIdentityDocuments(),
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

  onLoadToUpdate( visitor: Visitor ) {

    const { id } = visitor;

    this._alertService.showLoading();

    this._visitorService.getVisitorById( id )
    .subscribe( async (client) => {

      const { identityDocument, personType, userCreate, isActive, createAt, ...rest } = client;

      this.onChangePersonType( personType );

      if( identityDocument ) {
        this.onChangeIdentityDocument( identityDocument );
      }

      this.visitorForm.reset({
        ...rest,
        personType,
        identityDocumentId: identityDocument?.id,
      });

      this.visitorForm.markAllAsTouched();

      this.btnShowVisitorModal.nativeElement.click();
      this._alertService.close();

    } );

  }

  onChangePersonType( personType: PersonType ) {

    this._isJuridicPerson.set( personType == PersonType.JuridicPerson );

    this.visitorForm.get('name')?.clearValidators();
    this.visitorForm.get('surname')?.clearValidators();
    this.visitorForm.get('bussinessName')?.clearValidators();
    this.visitorForm.get('legalRepresentative')?.clearValidators();
    this.visitorForm.get('gender')?.clearValidators();
    this.visitorForm.get('civilStatus')?.clearValidators();

    if( personType == PersonType.JuridicPerson ) {

      this.visitorForm.get('name')?.setValue('');
      this.visitorForm.get('surname')?.setValue('');
      this.visitorForm.get('gender')?.setValue(null);
      this.visitorForm.get('civilStatus')?.setValue(null);

      this.visitorForm.get('bussinessName')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 6 ),
      ] );

      this.visitorForm.get('legalRepresentative')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 6 ),
      ] );

      this.visitorForm.get('gender')?.clearValidators();
      this.visitorForm.get('civilStatus')?.clearValidators();

    } else {

      this.visitorForm.get('bussinessName')?.setValue('');
      this.visitorForm.get('legalRepresentative')?.setValue('');

      this.visitorForm.get('name')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 3 ),
      ] );

      this.visitorForm.get('surname')?.addValidators( [
        Validators.required,
        Validators.pattern( fullTextPatt ),
        Validators.minLength( 3 ),
      ] );

      this.visitorForm.get('gender')?.addValidators( [ Validators.required ] );
      this.visitorForm.get('civilStatus')?.addValidators( [ Validators.required ] );
    }

    this.visitorForm.get('name')?.updateValueAndValidity();
    this.visitorForm.get('surname')?.updateValueAndValidity();
    this.visitorForm.get('bussinessName')?.updateValueAndValidity();
    this.visitorForm.get('legalRepresentative')?.updateValueAndValidity();
    this.visitorForm.get('gender')?.updateValueAndValidity();
    this.visitorForm.get('civilStatus')?.updateValueAndValidity();

  }

  onChangeIdentityDocument( identityDocument: IdentityDocument ) {

    const { longitude, isAlphaNumeric, isLongitudeExact } = identityDocument;

    this.visitorForm.get('identityNumber')?.clearValidators();
    this.visitorForm.get('identityNumber')?.addValidators( [
      Validators.required,
      Validators.pattern( isAlphaNumeric ? numberDocumentPatt : numberPatt ),
      Validators.minLength( isLongitudeExact ? longitude : 6 ),
      Validators.maxLength( longitude ),
      ] );

    this.visitorForm.get('identityNumber')?.updateValueAndValidity();
  }

  async onRemoveConfirm( visitor: Visitor ) {

    const responseConfirm = await this._alertService.showConfirmAlert(
      'Confirmación',
      `¿Está seguro de eliminar visitante: "${ visitor.fullname }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._onRemoveVisitor( visitor.id );
    }

  }

  private _onRemoveVisitor( visitorId: string ) {
    this._visitorService.removeVisitor( visitorId )
    .subscribe( (visitorDeleted) => {
      this._alertService.showAlert(`Visitante eliminado exitosamente`, undefined, 'success');

      this.onGetVisitors();
    });
  }

  onResetAfterSubmit() {
    this.visitorModalTitle = 'Crear nuevo visitante';
    this.visitorForm.reset();
    this._saveInProgress.set( false );
  }

  onSubmit() {

    this.visitorForm.markAllAsTouched();

    if( this.isFormInvalid || this.saveInProgress() ) return;

    const { id = 'xD', ...body } = this.visitorBody;

    if( !ISUUID( id ) ) {

      // const allowCreate = this._webUrlPermissionMethods.some(
      //   (permission) => permission.webApi == apiClient && permission.methods.includes( 'POST' )
      // );

      // if( !allowCreate ) {
      //   this._alertService.showAlert( undefined, 'No tiene permiso para crear un cliente', 'warning');
      //   return;
      // }

      this._saveInProgress.set( true );

      this._visitorService.createVisitor( body )
      .subscribe({
        next: async ( clientCreated ) => {

          this.onResetAfterSubmit();
          this.btnCloseVisitorModal.nativeElement.click();
          this.onGetVisitors();

          this._alertService.showAlert('Visitante creado exitosamente', undefined, 'success');

        }, error: (err) => {

          this._saveInProgress.set( false );
        }
      });
      return;
    }

    // const allowUpdate = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiClient && permission.methods.includes( 'PATCH' )
    // );

    // if( !allowUpdate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para actualizar un Visitante', 'warning');
    //   return;
    // }

    this._saveInProgress.set( true );

    this._visitorService.updateVisitor( id, body )
    .subscribe({
      next: async ( clientUpdated ) => {

        this.onResetAfterSubmit();
        this.btnCloseVisitorModal.nativeElement.click();
        this.onGetVisitors();

        this._alertService.showAlert('Visitante actualizado exitosamente', undefined, 'success');

      }, error: (err) => {

        this._saveInProgress.set( false );
      }
    });

  }

}
