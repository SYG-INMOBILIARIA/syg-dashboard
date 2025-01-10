import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ContractService } from '../../services/contract.service';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { NomenclatureService } from '@shared/services/nomenclature.service';
import { AlertService } from '@shared/services/alert.service';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { Contract } from '../../interfaces';
import { PipesModule } from '@pipes/pipes.module';
import { MatDialog } from '@angular/material/dialog';
import { ContractModalComponent } from '../../components/contract-modal/contract-modal.component';
import { Subscription, forkJoin } from 'rxjs';
import { ProyectService } from '../../services/proyect.service';
import { Nomenclature } from '@shared/interfaces';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PaginationComponent,
    PipesModule,
    ContractModalComponent
  ],
  templateUrl: './contracts.component.html',
  styles: ``
})
export default class ContractsComponent implements OnInit, OnDestroy {

  private _dialog$?: Subscription;

  @ViewChild('btnCloseContractModal') btnCloseContractModal!: ElementRef<HTMLButtonElement>;
  @ViewChild('btnShowContractModal') btnShowContractModal!: ElementRef<HTMLButtonElement>;

  public contractModalTitle = 'Crear nuevo contrato';

  private _nomenclatureService = inject( NomenclatureService );
  private _alertService = inject( AlertService );
  private _proyectService = inject( ProyectService );
  private _formBuilder = inject( UntypedFormBuilder );
  private _contractService = inject( ContractService );
  readonly dialog = inject( MatDialog );

  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _isLoading = signal( true );
  private _isSaving = signal( false );
  private _totalContracts = signal<number>( 0 );
  private _contracts = signal<Contract[]>( [] );
  private _paymentTypes = signal<Nomenclature[]>( [] );

  public isLoading = computed( () => this._isLoading() );
  public isSaving = computed( () => this._isSaving() );
  public totalContracts = computed( () => this._totalContracts() );
  public contracts = computed( () => this._contracts() );
  public paymentTypes = computed( () => this._paymentTypes() );

  get isInvalidSearchInput() { return this.searchInput.invalid; }

  ngOnInit(): void {

    this.onGetContracts();
    this.onGetPaymentTypes();
  }

  onGetContracts( page = 1 ) {

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._contractService.getContracts( page, filter )
    .subscribe({
      next: ({ contracts, total }) => {

        this._totalContracts.set( total );
        this._contracts.set( contracts );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });

  }

  onGetPaymentTypes() {
    this._nomenclatureService.getPaymentType()
    .subscribe( ({ nomenclatures }) => {
      this._paymentTypes.set( nomenclatures );
    });
  }

  onListenCreate( contractCreated?: Contract ) {

    if( contractCreated ) {
      this.onGetContracts();
    }

  }

  onLoadToUpdate( contract: Contract ) {

  }

  onRemoveConfirm( contract: Contract ) {

  }

  ngOnDestroy(): void {
    this._dialog$?.unsubscribe();
  }


}
