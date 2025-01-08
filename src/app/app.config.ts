import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { FlatpickrDirective, provideFlatpickrDefaults } from 'angularx-flatpickr';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatNativeDateModule } from '@angular/material/core';

import { routes } from './app.routes';
import { HandleErrorInterceptor, TokenInterceptor } from '@shared/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [

    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(
      withInterceptors([ TokenInterceptor, HandleErrorInterceptor ]),
    ),
    provideAnimationsAsync(),
    provideFlatpickrDefaults(),
    importProvidersFrom(
      FlatpickrDirective,
      MatNativeDateModule
    ),
  ],
};
