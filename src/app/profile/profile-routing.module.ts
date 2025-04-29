import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileLayoutComponent } from '../layouts/profile-layout/profile-layout.component';
import { isAuthenticatedGuard, saveCurrentPageGuard } from '@shared/guards';
import { HomeProfileComponent } from './pages/home-profile/home-profile.component';

const routes: Routes = [
  {
    path: '',
    component: ProfileLayoutComponent,
    canActivate: [ isAuthenticatedGuard ],
    canActivateChild: [ saveCurrentPageGuard,  ], //verifyRoleMenuAllowedGuard
    children: [

      { path: '', component: HomeProfileComponent },
      {
        path: 'home',
        component: HomeProfileComponent
      },
      {
        path: 'clients',
        loadComponent: () => import('./pages/client-profile/client-profile.component')
      },
      {
        path: 'commissions',
        loadComponent: () => import('./pages/commission-profile/commission-profile.component')
      },
      {
        path: 'payments',
        loadComponent: () => import('./pages/payment-profile/payment-profile.component')
      },
      { path: '**', redirectTo: 'home' },

    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class ProfileRoutingModule {}
