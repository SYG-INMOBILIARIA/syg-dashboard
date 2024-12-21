import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, output } from '@angular/core';

import { NgxPaginationModule, PaginationInstance, PaginationControlsDirective } from 'ngx-pagination';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [
    CommonModule,
    NgxPaginationModule
  ],
  templateUrl: './pagination.component.html',
  styles: ``,
  host: {
    class: "flex justify-between pl-4 pr-5 pt-3 pb-2"
  }
})
export class PaginationComponent {

  @Input({ required: true }) set totalItems( value: number ) {
    this.config.totalItems = value;
  };

  onChangePage = output<number>();

  @ViewChild('paginateElement') paginateElement!: PaginationControlsDirective;

  public config: PaginationInstance = {
      id: 'custom',
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0,
  };

  get totalItems(): number { return this.config.totalItems! };

  get showFirst(): number {
    return ((this.config.currentPage - 1) * 10) + 1;
  }

  get showLast() {
    return this.config.totalItems! <= 10 ? this.config.totalItems : this.config.currentPage * 10;
  }

  onPageChange( page: number ) {
    this.config.currentPage = page;
    this.onChangePage.emit( page );
  }

}
