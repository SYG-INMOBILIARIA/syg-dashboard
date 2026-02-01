import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { NgSelectModule } from '@ng-select/ng-select';

import { VisitorService } from './services/visitor.service';
import { Visitor } from './interfaces';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { PipesModule } from '@pipes/pipes.module';
import { AlertService } from '@shared/services/alert.service';
import { IdentityDocument } from '@modules/admin/interfaces';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { IdentityDocumentService } from '@modules/admin/services/identity-document.service';
import { Nomenclature } from '@shared/interfaces';
import { initFlowbite } from 'flowbite';
import { MatDialog } from '@angular/material/dialog';
import { VisitorModalComponent } from '@modules/admin/components/visitor-modal/visitor-modal.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    PaginationComponent,
    NgSelectModule,
  ],
  templateUrl: './visitors.component.html',
  styles: ``
})
export default class VisitorsComponent implements OnInit, OnDestroy {

  private _dialog$?: Subscription;

  private _visitorService = inject( VisitorService );
  private _alertService = inject( AlertService );
  private _nomenclatureService = inject( NomenclatureService );
  private _identityDocService = inject( IdentityDocumentService );
  private readonly _dialog = inject(MatDialog);

  private _listInProgress = signal<boolean>( false );
  private _saveInProgress = signal<boolean>( false );
  private _visitors = signal<Visitor[]>( [] );
  private _visitorToUpdate = signal<Visitor | null>( null );
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

  get isInvalidSearchInput() { return this.searchInput.invalid; }


  ngOnInit(): void {
    initFlowbite();
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
    .subscribe( ( visitor ) => {

      this._visitorToUpdate.set( visitor );
      this._alertService.close();
      this.onShowVisitorModal();

    } );

  }


  async onRemoveConfirm( visitor: Visitor ) {

    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar visitante: "${ visitor.fullname }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._onRemoveVisitor( visitor.id );
    }

  }

  private _onRemoveVisitor( visitorId: string ) {

    this._alertService.showLoading();
    this._visitorService.removeVisitor( visitorId )
    .subscribe( (visitorDeleted) => {
      this._alertService.close();
      this._alertService.showAlert(`Visitante eliminado exitosamente`, undefined, 'success');

      this.onGetVisitors();
    });
  }

  onShowVisitorModal() {

    // const allowCreate = this._webUrlPermissionMethods.some(
    //   (permission) => permission.webApi == apiClient && permission.methods.includes( 'POST' )
    // );

    // if( !allowCreate ) {
    //   this._alertService.showAlert( undefined, 'No tiene permiso para crear un cliente', 'warning');
    //   return;
    // }

    const dialogRef = this._dialog.open( VisitorModalComponent , {
      width: '30vw',
      height: '100vh',
      maxWidth: '30vw',
      // maxHeight: '100vh',
      enterAnimationDuration: '0ms',
      exitAnimationDuration: '0ms',
      closeOnNavigation: true,

      data: {
        visitorToUpdate: this._visitorToUpdate(),
        identityDocuments: this._identityDocuments(),
        civilStatus: this._civilStatus(),
        genders: this._genders(),
        personTypes: this._personTypes(),
      }
    });

    this._dialog$ = dialogRef.afterClosed().subscribe( (visitCreatedOrUpdated: any | null) => {

      if (visitCreatedOrUpdated) {
        this.onGetVisitors();
      }

      this._visitorToUpdate.set( null );
      this._dialog$?.unsubscribe();
    });

  }

  ngOnDestroy(): void {
    this._dialog$?.unsubscribe();
  }

}
