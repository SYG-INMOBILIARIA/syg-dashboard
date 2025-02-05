import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardLayoutComponent } from '../layouts/dashboard-layout/dashboard-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { ComponentsModule } from './components/components.module';
import { authReducer } from '@redux/reducers/auth.reducer';

@NgModule({
  declarations: [
    DashboardLayoutComponent,
    HomeComponent
  ],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    ComponentsModule,
    // StoreModule.forFeature('auth', authReducer),
  ]
})
export default class DashboardModule { }
