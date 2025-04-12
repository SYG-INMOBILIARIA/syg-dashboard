import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardLayoutComponent } from '../layouts/dashboard-layout/dashboard-layout.component';
import { HomeComponent } from './pages/home/home.component';
import {
  saveCurrentPageGuard,
  isAuthenticatedGuard,
  verifyRoleMenuAllowedGuard
} from './guards';


const routes: Routes = [
  {
    path: '',
    canActivate: [ isAuthenticatedGuard ],
    canMatch: [ saveCurrentPageGuard ],
    component: DashboardLayoutComponent,
    canActivateChild: [ verifyRoleMenuAllowedGuard ],
    children: [
      { path: '', component: HomeComponent },
      { path: 'home', component: HomeComponent },

      { path: 'roles', loadComponent: () => import('../modules/security/pages/roles/roles.component') },
      { path: 'menus', loadComponent: () => import('../modules/security/pages/menus/menus.component') },
      { path: 'permissions', loadComponent: () => import('../modules/security/pages/permissions/permissions.component') },
      { path: 'users', loadComponent: () => import('../modules/security/pages/users/users.component') },

      { path: 'clients', loadComponent: () => import('../modules/admin/pages/clients/clients.component') },
      { path: 'proyects', loadComponent: () => import('../modules/admin/pages/proyects/proyects.component') },
      { path: 'create-proyect', loadComponent: () => import('../modules/admin/pages/proyect-form/proyect-form.component') },
      { path: 'update-proyect/:proyectId', loadComponent: () => import('../modules/admin/pages/proyect-form/proyect-form.component') },
      {
        path: 'lotes-by-proyect/:proyectId',
        loadComponent: () => import('../modules/admin/pages/lotes-by-proyect/lotes-by-proyect.component')
      },
      {
        path: 'financings-by-proyect/:proyectId',
        loadComponent: () => import('../modules/admin/pages/financing-by-proyect/financing-by-proyect.component')
      },
      {
        path: 'financings-by-proyect',
        loadComponent: () => import('../modules/admin/pages/financing-by-proyect/financing-by-proyect.component')
      },
      { path: 'contracts', loadComponent: () => import('../modules/admin/pages/contracts/contracts.component') },
      { path: 'payments-method', loadComponent: () => import('../modules/admin/pages/payment-method/payment-method.component') },
      { path: 'contract-payments', loadComponent: () => import('../modules/admin/pages/contract-payment/contract-payment.component') },

      { path: '**', redirectTo: 'home' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
