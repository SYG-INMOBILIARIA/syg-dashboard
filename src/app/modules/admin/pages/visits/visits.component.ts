import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Subscription } from 'rxjs';

import { VisitorService } from '../visitors/services/visitor.service';
import { Visitor } from '../visitors/interfaces';
import { VisitModalComponent } from '@modules/admin/components/visit-modal/visit-modal.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { SellerService } from '@modules/admin/services/seller.service';
import { Nomenclature } from '@shared/interfaces';
import { IdentityDocument, Seller } from '@modules/admin/interfaces';
import { VisitService } from './services/visit.service';
import { Visit } from './interfaces';
import { MomentPipe } from '@pipes/moment.pipe';
import { AlertService } from '@shared/services/alert.service';
import { IdentityDocumentService } from '@modules/admin/services/identity-document.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PaginationComponent,
    MomentPipe
  ],
  providers: [
    MomentPipe
  ],
  templateUrl: './visits.component.html',
  styles: ``
})
export default class VisitsComponent implements OnInit, OnDestroy {

  private _dialog$?: Subscription;
  private readonly _dialog = inject(MatDialog);
  private readonly _visitService = inject( VisitService );
  private readonly _visitorService = inject( VisitorService );
  private readonly _sellerService = inject( SellerService );
  private readonly _nomenclatureService = inject( NomenclatureService );
  private readonly _identityDocService = inject( IdentityDocumentService );
  private readonly _alertService = inject( AlertService );
  private _momentPipe = inject( MomentPipe );

  private _allowList = signal( true );
  private _listInProgress = signal( true );
  private _visits = signal<Visit[]>( [] );
  private _visitToUpdate = signal<Visit | null>( null );
  private _totalVisits = signal( 0 );
  private _identityDocuments = signal<IdentityDocument[]>([]);
  private _civilStatus = signal<Nomenclature[]>([]);
  private _genders = signal<Nomenclature[]>([]);
  private _personTypes = signal<Nomenclature[]>([]);

  public allowList = computed( () => this._allowList() );
  public listInProgress = computed( () => this._listInProgress() );
  public visits = computed( () => this._visits() );
  public totalVisits = computed( () => this._totalVisits() );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _visitors: Visitor[] = [];
  private _sellers: Seller[] = [];
  private _visitStatus: Nomenclature[] = [];

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {
    this._onGetSelectsData();
    this.onGetVisits();
  }

  private _onGetSelectsData() {

    forkJoin({
      visitStatusResponse: this._nomenclatureService.getVisitStatus(),
      visitorsResponse: this._visitorService.getVisitors( 1, '', 10 ),
      sellersResponse: this._sellerService.getSellers( 1, '', 5 ),

      gendersResponse: this._nomenclatureService.getGender(),
      civilStatusResponse: this._nomenclatureService.getCivilStatus(),
      personTypesResponse: this._nomenclatureService.getPersonType(),
      identityDocumentsResponse: this._identityDocService.getIdentityDocuments(),
    }).subscribe( ({ visitStatusResponse, visitorsResponse, sellersResponse, identityDocumentsResponse, personTypesResponse, civilStatusResponse, gendersResponse }) => {

      const { identityDocuments } = identityDocumentsResponse;
      const { nomenclatures: personTypes } = personTypesResponse;
      const { nomenclatures: civilStatus } = civilStatusResponse;
      const { nomenclatures: genders } = gendersResponse;

      this._identityDocuments.set( identityDocuments );
      this._civilStatus.set( civilStatus );
      this._genders.set( genders );
      this._personTypes.set( personTypes );

      this._visitStatus = visitStatusResponse.nomenclatures;
      this._visitors = visitorsResponse.visitors;
      this._sellers = sellersResponse.sellers;

    } );

  }

  onOpenVisitModal() {

    const dialogRef = this._dialog.open( VisitModalComponent , {
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
        visitToUpdate: this._visitToUpdate()
      }
    });

    this._dialog$ = dialogRef.afterClosed().subscribe( (visitCreatedOrUpdated: any | null) => {

      if (visitCreatedOrUpdated) {
        this.onGetVisits();
      }

      this._visitToUpdate.set( null );
      this._dialog$?.unsubscribe();
    });

  }

  onGetVisits( page = 1 ) {

    this._listInProgress.set( true );

    this._visitService.getVisits( page, this.searchInput.value || '', 5 )
      .subscribe( ({ visits, total }) => {

        this._visits.set( visits );
        this._totalVisits.set( total );
        this._listInProgress.set( false );

    } );


  }

  onLoadToUpdate( visit: Visit ) {

    this._alertService.showLoading();

    this._visitService.getVisitById( visit.id )
      .subscribe( ( visitToUpdate ) => {

        this._visitToUpdate.set( visitToUpdate );
        this._alertService.close();
        this.onOpenVisitModal();

    });
  }

  async onRemoveConfirm( visit: Visit ) {

    const responseConfirm = await this._alertService.showConfirmAlert(
      undefined,
      `¿Está seguro de eliminar visita con fecha: "${ this._momentPipe.transform(visit.visitDate, 'createAt')  }"?`
    );

    if( responseConfirm.isConfirmed ) {
      this._onRemoveVisit( visit.id );
    }

  }

  private _onRemoveVisit( visitId: string ) {

    this._alertService.showLoading();
    this._visitService.removeVisit( visitId )
    .subscribe( (visitDeleted) => {
      this._alertService.close();
      this._alertService.showAlert(`Visita eliminada exitosamente`, undefined, 'success');
      this.onGetVisits();
    });

  }

  ngOnDestroy(): void {
    this._dialog$?.unsubscribe();
  }

}
