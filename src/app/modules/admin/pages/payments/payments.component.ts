import { Component } from '@angular/core';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    PaginationComponent
  ],
  templateUrl: './payments.component.html',
  styles: ``
})
export default  class PaymentsComponent {

}
