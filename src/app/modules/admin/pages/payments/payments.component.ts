import { Component, OnInit } from '@angular/core';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    PaginationComponent
  ],
  templateUrl: './payments.component.html',
  styles: ``
})
export default  class PaymentsComponent implements OnInit {

  ngOnInit(): void {
    initFlowbite();
  }

}
