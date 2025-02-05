import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { SidenavComponent } from './sidenav/sidenav.component';
import { NavbarComponent } from './navbar/navbar.component';
import { NotificationDropdownComponent } from './notification-dropdown/notification-dropdown.component';
import { UserMenuDropdownComponent } from './user-menu-dropdown/user-menu-dropdown.component';

@NgModule({
  declarations: [
    SidenavComponent,
    NavbarComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    NotificationDropdownComponent,
    UserMenuDropdownComponent
  ],
  exports: [
    SidenavComponent,
    NavbarComponent,
  ]
})
export class ComponentsModule { }
