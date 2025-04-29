import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import ClientIndicatorsComponent from '../../components/client-indicators/client-indicators.component';
import { ProfileService } from '../../services/profile.service';
import { Client, ClientStatus } from '../../../modules/admin/interfaces';
import { FormControl, FormsModule, Validators } from '@angular/forms';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { environments } from '@envs/environments';
import { PipesModule } from '@pipes/pipes.module';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ClientIndicatorsComponent,
    PipesModule,
    PaginationComponent
  ],
  templateUrl: './client-profile.component.html',
  styles: ``
})
export default class ClientProfileComponent implements OnInit {

  private _profileService = inject( ProfileService );

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

  ngOnInit(): void {

    this.onGetMyClients();

  }

  onGetMyClients( page = 1 ) {

    const filter = this.searchInput.value ?? '';

    this._isLoading.set( true );
    this._profileService.getMyClients( page, filter, 5 )
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

}
