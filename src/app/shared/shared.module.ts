import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Error404Component } from './pages/error404/error404.component';
import { Error500Component } from './pages/error500/error500.component';



@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    Error404Component,
    Error500Component,
  ],
  exports: [
    Error404Component,
    Error500Component
  ]
})
export class SharedModule { }
