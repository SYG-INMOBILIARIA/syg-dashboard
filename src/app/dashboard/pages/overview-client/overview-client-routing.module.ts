import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { isAuthenticatedGuard, saveCurrentPageGuard } from '@shared/guards';

import { OverviewClientLayoutComponent } from './layouts/overview-client-layout/overview-client-layout.component';
import OverviewClientPaymentsComponent from './pages/overview-client-payments/overview-client-payments.component';

const routes: Routes = [
  {
    path: '',
    component: OverviewClientLayoutComponent,
    canActivate: [ isAuthenticatedGuard ],
    canActivateChild: [ saveCurrentPageGuard,  ], //verifyRoleMenuAllowedGuard
    children: [

      //{ path: '', component: OverviewClientPaymentsComponent },
      {
        path: 'payments',
        component: OverviewClientPaymentsComponent,
        data: { title: 'Pagos' }
      },
      {
        path: 'debts',
        loadComponent: () => import('./pages/overview-client-debts/overview-client-debts.component'),
        data: { title: 'Deudas' }
      },
      {
        path: 'charts',
        loadComponent: () => import('./pages/overview-client-charts/overview-client-charts.component'),
        data: { title: 'Estadísticas' }
      },
      {
        path: 'timeline',
        loadComponent: () => import('./pages/overview-client-timeline/overview-client-timeline.component'),
        data: { title: 'Línea de tiempo' }
      },
      { path: '**', redirectTo: 'payments' },

    ]
  },


  //{ path: 'path/:routeParam', component: MyComponent },
  //{ path: 'staticPath', component: ... },
  //{ path: '**', component: ... },
  //{ path: 'oldPath', redirectTo: '/staticPath' },
  //{ path: ..., component: ..., data: { message: 'Custom' }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class OverviewClientRoutingModule {}
