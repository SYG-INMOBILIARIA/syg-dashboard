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
      { path: 'home', component: HomeComponent, data: { title: 'Inicio' } },

      {
        path: 'roles',
        loadComponent: () => import('../modules/security/pages/roles/roles.component'),
        data: { title: 'Roles' }
      },
      {
        path: 'menus',
        loadComponent: () => import('../modules/security/pages/menus/menus.component'),
        data: { title: 'Menú' }
      },
      {
        path: 'permissions',
        loadComponent: () => import('../modules/security/pages/permissions/permissions.component')
      },
      {
        path: 'users',
        loadComponent: () => import('../modules/security/pages/users/users.component'),
        data: { title: 'Usuarios' }
      },
      {
        path: 'clients',
        loadComponent: () => import('../modules/admin/pages/clients/clients.component'),
        data: { title: 'Clientes' }
      },
      {
        path: 'proyects',
        loadComponent: () => import('../modules/admin/pages/proyects/proyects.component'),
        data: { title: 'Proyectos' }
      },
      {
        path: 'create-proyect',
        loadComponent: () => import('../modules/admin/pages/proyect-form/proyect-form.component'),
        data: { title: 'Cear proyecto' }
      },
      {
        path: 'update-proyect/:proyectId',
        loadComponent: () => import('../modules/admin/pages/proyect-form/proyect-form.component'),
        data: { title: 'Actualizar proyecto' }
      },
      {
        path: 'lotes-by-proyect/:proyectId',
        loadComponent: () => import('../modules/admin/pages/lotes-by-proyect/lotes-by-proyect.component'),
        data: { title: 'Lotes por proyecto' }
      },
      {
        path: 'financings-by-proyect/:proyectId',
        loadComponent: () => import('../modules/admin/pages/financing-by-proyect/financing-by-proyect.component'),
        data: { title: 'Financiamiento por proyecto' }
      },
      {
        path: 'financings-by-proyect',
        loadComponent: () => import('../modules/admin/pages/financing-by-proyect/financing-by-proyect.component'),
        data: { title: 'Financiamientos' }
      },
      {
        path: 'contracts',
        loadComponent: () => import('../modules/admin/pages/contracts/contracts.component'),
        data: { title: 'Contratos' }
      },
      {
        path: 'sellers',
        loadComponent: () => import('../modules/admin/pages/sellers/sellers.component'),
        data: { title: 'Asesores comerciales' }
      },
      {
        path: 'contracts/create-contract',
        loadComponent: () => import('../modules/admin/pages/contract-form/contract-form.component'),
        data: { title: 'Crear contrato' }
      },
      {
        path: 'payments-method',
        loadComponent: () => import('../modules/admin/pages/payment-method/payment-method.component'),
        data: { title: 'Métodos de pago' }
      },
      {
        path: 'paid-quotes',
        loadComponent: () => import('../modules/admin/pages/paid-quotes/paid-quotes.component'),
        data: { title: 'Pago de cuotas' }
      },
      {
        path: 'tardiness-config',
        loadComponent: () => import('../modules/config/pages/tardiness-config/tardiness-config.component'),
        data: { title: 'Configuración de mora' }
      },
      {
        path: 'area-company',
        loadComponent: () => import('../modules/config/pages/area-company/area-company.component'),
        data: { title: 'Áreas de empresa' }
      },
      {
        path: 'expenses',
        loadComponent: () => import('../modules/admin/pages/expenses/expenses.component'),
        data: { title: 'Egresos' }
      },
      {
        path: 'expense-type',
        loadComponent: () => import('../modules/config/pages/expense-type/expense-type.component'),
        data: { title: 'Tipo de egreso' }
      },
      {
        path: 'leads',
        loadComponent: () => import('../modules/admin/pages/leads/leads.component'),
        data: { title: 'Clientes potenciales' }
      },
      {
        path: 'profile',
        loadChildren: () => import('./pages/profile/profile.module'),
        data: { title: 'Perfil' }
      },
      {
        path: 'client-profile',
        loadChildren: () => import('./pages/profile-client/profile-client.module'),
        data: { title: 'Perfil del cliente' }
      },
      {
        path: 'overview-client',
        loadChildren: () => import('./pages/overview-client/overview-client.module'),
        data: { title: 'Panel administrativo' }
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
