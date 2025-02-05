import { Routes } from '@angular/router';
import { Error401Component } from '@shared/pages/error401/error401.component';
import { Error404Component } from '@shared/pages/error404/error404.component';
import { Error500Component } from '@shared/pages/error500/error500.component';
import { LoadingComponent } from '@shared/pages/loading/loading.component';

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
    path: '404',
    // canMatch: [saveCurrentPageGuard],
    component: Error404Component
  },
  {
    path: '500',
    component: Error500Component
  },
  {
    path: '401',
    component: Error401Component
  },
  {
    path: 'loading',
    component: LoadingComponent
  },
  {
    path: '',
    redirectTo: 'loading',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '404',
    pathMatch: 'full'
  }
];
