import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error500',
  standalone: true,
  imports: [],
  templateUrl: './error500.component.html',
  styles: ``
})
export class Error500Component implements OnInit {

  private _router = inject( Router );

  ngOnInit(): void {

      const navigation = this._router.getCurrentNavigation();
      const error = navigation?.extras?.state?.["error"];

      console.log({ error });
  }

}
