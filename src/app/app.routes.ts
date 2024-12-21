import { Routes } from '@angular/router';
import { Error404Component } from '@shared/pages/error404/error404.component';
import { Error500Component } from '@shared/pages/error500/error500.component';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module')
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module')
  },
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    path: '404',
    // canMatch: [saveCurrentPageGuard],
    component: Error404Component
  },
  {
    path: '500',
    component: Error500Component
  },
  {
    path: '**',
    redirectTo: '404',
    pathMatch: 'full'
  }
];
