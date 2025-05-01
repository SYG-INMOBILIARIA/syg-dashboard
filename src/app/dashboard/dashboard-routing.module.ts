import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardLayoutComponent } from '../layouts/dashboard-layout/dashboard-layout.component';
import { HomeComponent } from './pages/home/home.component';
import {
  saveCurrentPageGuard,
  isAuthenticatedGuard,
  verifyRoleMenuAllowedGuard
} from '@shared/guards';

const routes: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [ isAuthenticatedGuard ],
    // canMatch: [  ],
    canActivateChild: [ saveCurrentPageGuard, verifyRoleMenuAllowedGuard ],
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
      { path: 'create-contract', loadComponent: () => import('../modules/admin/pages/contract-form/contract-form.component') },
      { path: 'payments-method', loadComponent: () => import('../modules/admin/pages/payment-method/payment-method.component') },
      { path: 'contract-payments', loadComponent: () => import('../modules/admin/pages/contract-payment/contract-payment.component') },
      { path: 'paid-quotes', loadComponent: () => import('../modules/admin/pages/paid-quotes/paid-quotes.component') },
      { path: 'tardiness-config', loadComponent: () => import('../modules/config/pages/tardiness-config/tardiness-config.component') },
      { path: 'area-company', loadComponent: () => import('../modules/config/pages/area-company/area-company.component') },
      { path: 'expenses', loadComponent: () => import('../modules/admin/pages/expenses/expenses.component') },
      {
        path: 'profile',
        loadChildren: () => import('../profile/profile.module')
      },

      // {
      //   path: 'profile/:nombre-usuario',
      //   loadChildren: () => import('../profile/profile.module')
      // },

      { path: '**', redirectTo: 'home' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
