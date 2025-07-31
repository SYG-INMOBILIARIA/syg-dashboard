import { Component, OnInit, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { Spanish } from 'flatpickr/dist/l10n/es';
import flatpickr from 'flatpickr';
import mapboxgl from 'mapbox-gl';

import { AuthStatus } from './auth/enums';
import { AuthService } from './auth/services/auth.service';
import { AppTheme, SettingsService } from '@shared/services/settings.service';
import { environments } from '@envs/environments';

mapboxgl.accessToken = environments.mapbox_key;
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'syg-dashboard';

  private _router = inject( Router );
  private _authService = inject( AuthService );
  private _settingsService = inject( SettingsService );

  isLoading = true;

  constructor() {

    effect( () => {

      setTimeout(() => {
        this.isLoading = false;
      }, 3400);

      const userAuthenticated = this._authService.personSession();

      if( userAuthenticated?.client?.id ) {
        localStorage.setItem('currentPage', '/dashboard/overview-client');
      }

      const currentPage = localStorage.getItem('currentPage') ?? '/dashboard';
      // console.log({currentPage});

      switch ( this._authService.authStatus() ) {
        case AuthStatus.authenticated:
            this._router.navigateByUrl(currentPage);
          break;

        case AuthStatus.noAuthenticated:
            this._router.navigateByUrl('/auth/login');
          break;

        default:
          // this._router.navigateByUrl('/loading');
          break;
      }

    } );

  }

  ngOnInit(): void {
    initFlowbite();
    this.flatpickrFactory();
    this.onCheckAppTheme();
  }

  onCheckAppTheme() {

    const theme: AppTheme = (localStorage.getItem('appTheme') as AppTheme) ?? 'ligth';
    this._settingsService.setTheme = theme;

  }

  flatpickrFactory() {
    flatpickr.localize(Spanish);
    return flatpickr;
  }


}
