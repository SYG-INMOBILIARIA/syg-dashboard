import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { validate as ISUUID } from 'uuid';


import { IdentityDocument, Seller } from '@modules/admin/interfaces';
import { Visitor } from '@modules/admin/pages/visitors/interfaces';
import { SellerService } from '@modules/admin/services/seller.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { InputErrorsDirective } from '@shared/directives/input-errors.directive';
import { descriptionPatt, fullTextPatt } from '@shared/helpers/regex.helper';
import { Nomenclature } from '@shared/interfaces';
import { FlatpickrDirective } from 'angularx-flatpickr';
import { VisitorModalComponent } from '../visitor-modal/visitor-modal.component';
import { Subscription } from 'rxjs';
import { Visit, VisitBody } from '@modules/admin/pages/visits/interfaces';
import { VisitService } from '@modules/admin/pages/visits/services/visit.service';
import { VisitorService } from '@modules/admin/pages/visitors/services/visitor.service';
import { AlertService } from '@shared/services/alert.service';

interface VisitDialogPayload {
  visitors: Visitor[];
  visitStatus: Nomenclature[];
  sellers: Seller[];

  identityDocuments : IdentityDocument[];
  civilStatus: Nomenclature[];
  genders: Nomenclature[];
  personTypes: Nomenclature[];

  visitToUpdate: Visit | null;
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
    NgSelectModule,
    FlatpickrDirective
  ],
  templateUrl: './visit-modal.component.html',
  styles: ``
})
export class VisitModalComponent implements OnInit {

  visitTitleModal = 'Crear nueva visita';

  private _dialog$?: Subscription;

  private readonly _alertService = inject( AlertService );
  private readonly _visitService = inject( VisitService );
  private readonly _visitorService = inject( VisitorService );
  private readonly _sellerService = inject( SellerService );
  private readonly _dialogRef = inject(MatDialogRef< VisitModalComponent>);
  private readonly _data = inject<VisitDialogPayload>(MAT_DIALOG_DATA);
  private readonly _dialog = inject(MatDialog);

  private _formBuilder = inject( UntypedFormBuilder );

  public visitForm = this._formBuilder.group({
    id:               [ '', [] ],
    visitorsIds:      [ [], [ Validators.required, Validators.minLength(1) ] ],
    visitDate:        [ null, [ Validators.required ] ],
    visitStatus:      [ null, [ Validators.required ] ],
    sellerUserId:     [ null, [ Validators.required ] ],
    observation:      [ '', [ Validators.pattern( descriptionPatt ) ] ],
  });

  private _savingInProgress = signal<boolean>( false );
  private _loadingVisitors = signal<boolean>( false );
  private _loadingSellers = signal<boolean>( false );
  private _visitors = signal<Visitor[]>( []);
  private _visitStatus = signal<Nomenclature[]>( [] );
  private _sellers = signal<Seller[]>( [] );

  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _civilStatus = signal<Nomenclature[]>([]);
  private _genders = signal<Nomenclature[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);

  public visitors = computed( () => this._visitors() );
  public visitStatus = computed( () => this._visitStatus() );
  public loadingVisitors = computed( () => this._loadingVisitors() );
  public loadingSellers = computed( () => this._loadingSellers() );
  public sellers = computed( () => this._sellers() );

  public savingInProgress = computed( () => this._savingInProgress() );

  public searchVisitorInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);
  public searchSellerInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  btnTextModal = 'Guardar';

  inputErrors( field: string ) {
    return this.visitForm.get(field)?.errors ?? null;
  }

  isTouched( field: string ) {
    return this.visitForm.get(field)?.touched ?? false;
  }

  get visitBody() { return this.visitForm.value as VisitBody; }
  get isFormInvalid() { return this.visitForm.invalid; }

  ngOnInit(): void {

    const { visitors, visitStatus, sellers, visitToUpdate, identityDocuments, civilStatus, genders, personTypes } = this._data;

    this._visitors.set( visitors );
    this._visitStatus.set( visitStatus );
    this._sellers.set( sellers );

    this._identityDocuments.set( identityDocuments );
    this._civilStatus.set( civilStatus );
    this._genders.set( genders );
    this._personTypes.set( personTypes );

    if ( visitToUpdate ) {
      this.visitTitleModal = 'Actualizar visita';
      this.btnTextModal = 'Guardar cambios';

      setTimeout(() => {
        this.visitForm.patchValue({
          id: visitToUpdate.id,
          visitorsIds: visitToUpdate.visitors.map( v => v.id ),
          visitDate: visitToUpdate.visitDate,
          visitStatus: visitToUpdate.visitStatus,
          sellerUserId: visitToUpdate.sellerUser.id,
          observation: visitToUpdate.observation
        });

      }, 500);
    }

  }

  onGetVisitors() {

    this._loadingVisitors.set( true );

    const filter = this.searchVisitorInput.value ?? '';

    this._visitorService.getVisitors( 1, filter, 100 )
      .subscribe( ({ visitors }) => {

        this._visitors.set( visitors );
        this._loadingVisitors.set( false );

      } );
  }

  onGetSellers() {

    this._loadingSellers.set( true );

    const filter = this.searchSellerInput.value ?? '';

    this._sellerService.getSellers( 1, filter, 100 )
      .subscribe( ({ sellers }) => {

        this._sellers.set( sellers );
        this._loadingSellers.set( false );

      } );
  }

  onClose() {
    this._dialogRef.close(null);
  }

  onSubmit() {

    this.visitForm.markAllAsTouched();

    if ( this.isFormInvalid || this._savingInProgress() ) return;

    this._savingInProgress.set( true );

    const { id = 'xD', ...body } = this.visitBody;

    if( !ISUUID( id ) ) {

      this._visitService.createVisit( body )
      .subscribe( {
        next: ( visitCreated ) => {
          this._savingInProgress.set( false );
          this._alertService.showAlert('Visita creada exitosamente', undefined, 'success');
          this._dialogRef.close( visitCreated );
        },
        error: () => {
          this._savingInProgress.set( false );
        }
      } );

      return;
    } else {

      this._visitService.updateVisit( id, body )
      .subscribe( {
        next: ( visitUpdated ) => {
          this._savingInProgress.set( false );
          this._alertService.showAlert('Visita actualizada exitosamente', undefined, 'success');
          this._dialogRef.close( visitUpdated );
        },
        error: () => {
          this._savingInProgress.set( false );
        }
      } );

    }


  }

  onShowVisitorModal() {

    const dialogRef = this._dialog.open( VisitorModalComponent , {
      width: '30vw',
      height: '100vh',
      maxWidth: '30vw',
      // maxHeight: '100vh',
      enterAnimationDuration: '0ms',
      exitAnimationDuration: '0ms',
      closeOnNavigation: true,

      data: {
        visitors: this._visitors,
        visitStatus: this._visitStatus,
        sellers: this._sellers,

        identityDocuments: this._identityDocuments(),
        civilStatus: this._civilStatus(),
        genders: this._genders(),
        personTypes: this._personTypes(),
      }
    });


    this._dialog$ = dialogRef.afterClosed().subscribe( (visitor: Visitor | null) => {

      if (visitor) {
        this._visitors.update( (visitors) => [visitor, ...visitors]  );
        this.visitForm.get('visitorsIds')?.setValue( [...(this.visitForm.get('visitorsIds')?.value ?? []), visitor.id ] );
      }

      this._dialog$?.unsubscribe();
    });

  }

}
