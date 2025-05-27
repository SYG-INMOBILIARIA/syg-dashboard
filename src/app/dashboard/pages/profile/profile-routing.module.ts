import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { isAuthenticatedGuard, saveCurrentPageGuard } from '@shared/guards';
import { HomeProfileComponent } from './pages/home-profile/home-profile.component';
import ProfileLayoutComponent from './layouts/profile-layout/profile-layout.component';

const routes: Routes = [
  {
    path: '',
    component: ProfileLayoutComponent,
    canActivate: [ isAuthenticatedGuard ],
    canActivateChild: [ saveCurrentPageGuard,  ], //verifyRoleMenuAllowedGuard
    children: [

      { path: '', component: HomeProfileComponent },
      {
        path: 'home/:nombre-usuario',
        component: HomeProfileComponent
      },
      {
        path: 'clients/:nombre-usuario',
        loadComponent: () => import('./pages/client-profile/client-profile.component')
      },
      {
        path: 'commissions/:nombre-usuario',
        loadComponent: () => import('./pages/commission-profile/commission-profile.component')
      },
      {
        path: 'payments/:nombre-usuario',
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
