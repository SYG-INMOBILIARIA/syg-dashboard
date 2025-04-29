import { AfterViewInit, Component, OnInit } from '@angular/core';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styles: ``
})
export class DashboardLayoutComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    initFlowbite();
  }


}
