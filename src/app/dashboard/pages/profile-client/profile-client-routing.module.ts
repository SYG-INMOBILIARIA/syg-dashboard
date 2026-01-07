import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { ClientInfoComponent } from './pages/client-info/client-info.component';
import { ClientPaymentsComponent } from './pages/client-payments/client-payments.component';
import { ProfileClientLayoutComponent } from './layouts/profile-client-layout/profile-client-layout.component';
import { isAuthenticatedGuard, saveCurrentPageGuard } from '@shared/guards';

const routes: Routes = [
  {
    path: '',
    component: ProfileClientLayoutComponent,
    canActivate: [ isAuthenticatedGuard ],
    canActivateChild: [ saveCurrentPageGuard,  ], //verifyRoleMenuAllowedGuard
    children: [

      { path: '', component: ClientInfoComponent },
      {
        path: 'info',
        component: ClientInfoComponent,
        data: { title: 'Overview' }
      },
      {
        path: 'payments',
        component: ClientPaymentsComponent,
        data: { title: 'Pagos' }
      },

      { path: '**', redirectTo: 'home' },

    ]

  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileClientRoutingModule {}
