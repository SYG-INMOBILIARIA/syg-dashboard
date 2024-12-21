import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MiniMapComponent } from '@shared/components/mini-map/mini-map.component';
import { fullTextPatt } from '@shared/helpers/regex.helper';
import { ProyectService } from '../../services/proyect.service';
import { Proyect } from '../../interfaces';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MiniMapComponent,
    RouterModule
  ],
  templateUrl: './proyects.component.html',
  styles: ``
})
export default class ProyectsComponent implements OnInit {


  private _proyectService = inject( ProyectService );


  public searchInput = new FormControl('', [ Validators.pattern( fullTextPatt ) ]);

  private _filter = '';

  private _isLoading = signal( true );
  private _totalProyects = signal<number>( 0 );
  private _proyects = signal<Proyect[]>( [] );

  public proyects = computed( () => this._proyects() );
  public totalProyects = computed( () => this._totalProyects() );

  get isInvalidSearchInput() { return this.searchInput.invalid; }


  ngOnInit(): void {
    this.onGetProyects();
  }

  onSearch() {
    this._filter = this.searchInput.value ?? '';
    // this.onGetClients( 1 );
  }

  onGetProyects( page = 1 ) {
    this._proyectService.getProyects( page, this._filter )
    .subscribe( ( { proyects, total }) => {

      this._proyects.set( proyects );
      this._totalProyects.set( total );

    } )
  }

}
