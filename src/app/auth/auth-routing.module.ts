import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthLayoutComponent } from '../layouts/auth-layout/auth-layout.component';
import { LoginComponent } from './pages/login/login.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { isNotAuthenticatedGuard } from './guards/is-not-authenticated.guard';

const routes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    canMatch: [ isNotAuthenticatedGuard ],
    children: [
      { path: 'singin', component: LoginComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: '**', redirectTo: 'singin' }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild( routes ) ],
  exports: [ RouterModule ]
})
export class AuthRoutingModule { }
