import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, output } from '@angular/core';

import { NgxPaginationModule, PaginationInstance, PaginationControlsDirective } from 'ngx-pagination';

//* Contador a nivel de módulo para asignar un id único de ngx-pagination por instancia.
//* Sin esto, varias <app-pagination> en la misma página comparten el id 'custom' y
//* ngx-pagination entra en un bucle de detección de cambios ("Maximum call stack size exceeded").
let _paginationInstanceCounter = 0;

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [
    CommonModule,
    NgxPaginationModule
  ],
  templateUrl: './pagination.component.html',
  styles: ``,
  /**host: {
    class: "flex justify-between  "
  }*/
})
export class PaginationComponent {

  @Input({ required: true }) set totalItems( value: number ) {
    this.config.totalItems = value;
  };

  @Input({ required: false }) set itemsPerPage( value: number ) {
    this.config.itemsPerPage = value;
  };

  @Input() viewIsColumn: boolean = false;

  onChangePage = output<number>();


  @ViewChild('paginateElement') paginateElement!: PaginationControlsDirective;

  public config: PaginationInstance = {
      id: `pagination-${ _paginationInstanceCounter++ }`,
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0,
  };

  get totalItems(): number { return this.config.totalItems! };

  get showFirst(): number {
    return ((this.config.currentPage - 1) * this.config.itemsPerPage) + 1;
  }

  get showLast() {
    return this.config.totalItems! <= this.config.itemsPerPage ? this.config.totalItems : this.config.currentPage * this.config.itemsPerPage;
  }

  onPageChange( page: number ) {
    this.config.currentPage = page;
    this.onChangePage.emit( page );
  }

}
