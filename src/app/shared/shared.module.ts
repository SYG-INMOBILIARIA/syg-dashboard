import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Error404Component } from './pages/error404/error404.component';
import { Error500Component } from './pages/error500/error500.component';
import { Error401Component } from './pages/error401/error401.component';
import { LoadingComponent } from './pages/loading/loading.component';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    Error404Component,
    Error500Component,
    Error401Component,
    LoadingComponent

  ],
  exports: [
    Error404Component,
    Error500Component,
    Error401Component,
    LoadingComponent
  ]
})
export class SharedModule { }
