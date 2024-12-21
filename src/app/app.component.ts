import { Component, OnInit, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { AuthService } from './auth/services/auth.service';
import { AppTheme, SettingsService } from '@shared/services/settings.service';
import { AuthStatus } from './auth/enums';
import { Spanish } from 'flatpickr/dist/l10n/es';
import flatpickr from 'flatpickr';
import mapboxgl from 'mapbox-gl';
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

  constructor() {

    effect( () => {

      const currentPage = localStorage.getItem('currentPage') ?? '/dashboard';
      // console.log({currentPage});

      switch (this._authService.authStatus()) {
        case AuthStatus.authenticated:
            this._router.navigateByUrl(currentPage);
          break;

        case AuthStatus.noAuthenticated:
            this._router.navigateByUrl('/auth/login');
          break;

        default:
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
