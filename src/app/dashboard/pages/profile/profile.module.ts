import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PipesModule } from '@pipes/pipes.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileRoutingModule } from './profile-routing.module';
import { HomeProfileComponent } from './pages/home-profile/home-profile.component';
import SellerIndicatorsComponent from './components/seller-indicators/seller-indicators.component';
import ProfileLayoutComponent from './layouts/profile-layout/profile-layout.component';

@NgModule({
  declarations: [
    HomeProfileComponent,
  ],
  imports: [
    ProfileLayoutComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SellerIndicatorsComponent,
    PipesModule,
    ProfileRoutingModule,
  ],
})
export default class ProfileModule {}
