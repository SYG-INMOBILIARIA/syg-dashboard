import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { SidenavComponent } from './sidenav/sidenav.component';
import { NavbarComponent } from './navbar/navbar.component';
import { NotificationDropdownComponent } from './notification-dropdown/notification-dropdown.component';
import { UserMenuDropdownComponent } from './user-menu-dropdown/user-menu-dropdown.component';
import CardIndicatorComponent from './card-indicator/card-indicator.component';
import { BreadCrumbsComponent } from './bread-crumbs/bread-crumbs.component';

@NgModule({
  declarations: [
    SidenavComponent,
    NavbarComponent,
    BreadCrumbsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    NotificationDropdownComponent,
    UserMenuDropdownComponent,
    CardIndicatorComponent
  ],
  exports: [
    SidenavComponent,
    NavbarComponent,
    NotificationDropdownComponent,
    UserMenuDropdownComponent,
    CardIndicatorComponent,
    BreadCrumbsComponent,
  ]
})
export class ComponentsModule { }
