import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { validate as ISUUID } from 'uuid';

import CommissionIndicatorsComponent from '../../components/commission-indicators/commission-indicators.component';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { ProfileService } from '../../services/profile.service';
import { Commission } from '../../interfaces';
import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';

@Component({
  selector: 'app-commission-profile',
  standalone: true,
  imports: [
    CommonModule,
    CommissionIndicatorsComponent,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    PaginationComponent
  ],
  templateUrl: './commission-profile.component.html',
  styles: ``
})
export default class CommissionProfileComponent implements OnInit {

  private _profileService = inject( ProfileService );
  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _isLoading = signal( true );
  private _commissions = signal<Commission[]>( [] );
  private _commissionsTotal = signal<number>( 0 );

  public isLoading = computed( () => this._isLoading() );
  public commissions = computed( () => this._commissions() );
  public commissionsTotal = computed( () => this._commissionsTotal() );

  private _userSellerId = '';

  ngOnInit(): void {
    this._userSellerId = localStorage.getItem('userProfileId') ?? '';

  if( !ISUUID( this._userSellerId ) )
    throw new Error('userProfileId not found !!!');

    this.onGetComissions();
  }

  onGetComissions( page = 1 ) {

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._profileService.getMyCommissions( page, filter, 5, this._userSellerId  )
    .subscribe({
      next: ({ commissions, total }) => {

        this._commissionsTotal.set( total );
        this._commissions.set( commissions );
        this._isLoading.set( false );

      }, error: (err) => {
        this._isLoading.set( false );
      }
    });
  }

}
