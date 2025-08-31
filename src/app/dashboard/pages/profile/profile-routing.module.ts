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
        component: HomeProfileComponent,
        data: { title: 'Overview' }
      },
      {
        path: 'clients/:nombre-usuario',
        loadComponent: () => import('./pages/client-profile/client-profile.component'),
        data: { title: 'Clientes' }
      },
      {
        path: 'commissions/:nombre-usuario',
        loadComponent: () => import('./pages/commission-profile/commission-profile.component'),
        data: { title: 'Comisiones' }
      },
      {
        path: 'payments/:nombre-usuario',
        loadComponent: () => import('./pages/payment-profile/payment-profile.component'),
        data: { title: 'Pagos' }
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
