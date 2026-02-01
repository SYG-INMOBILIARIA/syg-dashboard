import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { validate as ISUUID } from 'uuid';

import { IdentityDocument, PersonType } from '@modules/admin/interfaces';
import { VisitorBody } from '@modules/admin/pages/visitors/interfaces/visitor-body.interface';
import { VisitorValidatorService } from '@modules/admin/pages/visitors/services/visitor-validator.service';
import { IdentityDocumentService } from '@modules/admin/services/identity-document.service';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { emailPatt, fullTextPatt, numberDocumentPatt, numberPatt, phonePatt } from '@shared/helpers/regex.helper';
import { Nomenclature } from '@shared/interfaces';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { VisitorService } from '@modules/admin/pages/visitors/services/visitor.service';
import { AlertService } from '@shared/services/alert.service';
import { Visitor } from '@modules/admin/pages/visitors/interfaces';

interface VisitorDialogPayload {

  identityDocuments : IdentityDocument[];
  civilStatus: Nomenclature[];
  genders: Nomenclature[];
  personTypes: Nomenclature[];

  visitorToUpdate: Visitor;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogContent,
    InputErrorsDirective,
    SpinnerComponent,
    NgSelectModule
  ],
  templateUrl: './visitor-modal.component.html',
  styles: ``
})
export class VisitorModalComponent implements OnInit {

  private _nomenclatureService = inject( NomenclatureService );
  private _identityDocService = inject( IdentityDocumentService );
  private _visitorService = inject( VisitorService );
  private _alertService = inject( AlertService );

  private _visitortValidatorService = inject( VisitorValidatorService );

  private readonly _dialogRef = inject(MatDialogRef< VisitorModalComponent>);
  private readonly _data = inject<VisitorDialogPayload>(MAT_DIALOG_DATA);

  private _formBuilder = inject( UntypedFormBuilder );
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

  private _saveInProgress = signal<boolean>( false );
  private _isJuridicPerson = signal( false );
  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _civilStatus = signal<Nomenclature[]>([]);
  private _genders = signal<Nomenclature[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);

  public saveInProgress = computed( () => this._saveInProgress() );
  public isJuridicPerson = computed( () => this._isJuridicPerson() );
  public identityDocuments = computed( () => this._identityDocuments() );
  public civilStatus = computed( () => this._civilStatus() );
  public genders = computed( () => this._genders() );
  public personTypes = computed( () => this._personTypes() );

  get isFormInvalid() { return this.visitorForm.invalid; }
  get visitorBody() { return this.visitorForm.value as VisitorBody }

  inputErrors( field: string ) {
    return this.visitorForm.get(field)?.errors ?? null;
  }
  isTouched( field: string ) {
    return this.visitorForm.get(field)?.touched ?? false;
  }

  ngOnInit(): void {

    const { visitorToUpdate, identityDocuments, civilStatus, genders, personTypes } = this._data;

    this._identityDocuments.set( identityDocuments );
    this._civilStatus.set( civilStatus );
    this._genders.set( genders );
    this._personTypes.set( personTypes );

    if( visitorToUpdate ) {

      const { identityDocument, ...body } = visitorToUpdate;

      setTimeout(() => {

        this.visitorForm.patchValue({
        ...body,
        identityDocumentId: identityDocument.id,
      });

      this.onChangePersonType( visitorToUpdate.personType );

      }, 500);
    }

  }


  onClose() {
    this._dialogRef.close(null);
  }

  onSubmit() {

    const { id = 'xD', ...body } = this.visitorBody;

    this._saveInProgress.set( true );

    if( !ISUUID( id ) ) {


      this._visitorService.createVisitor( body )
      .subscribe({
        next: async ( visitorCreated ) => {

          this._alertService.showAlert('Visitante creado exitosamente', undefined, 'success');
          this._dialogRef.close( visitorCreated );

        }, error: (err) => {

          this._saveInProgress.set( false );
        }
      });

      return;

    } else {

      this._visitorService.updateVisitor( id, body )
      .subscribe({
        next: async ( visitorUpdated ) => {
          this._alertService.showAlert('Visitante actualizado exitosamente', undefined, 'success');
          this._dialogRef.close( visitorUpdated );
        }, error: (err) => {
          this._saveInProgress.set( false );
        }
      });

    }

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


}
