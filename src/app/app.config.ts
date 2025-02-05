import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { FlatpickrDirective, provideFlatpickrDefaults } from 'angularx-flatpickr';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatNativeDateModule } from '@angular/material/core';
import { ActionReducerMap, StoreModule, provideStore } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { HandleErrorInterceptor, TokenInterceptor } from '@shared/interceptors';
import { AuthState, authReducer } from './redux/reducers/auth.reducer';

export interface AppState {
  auth: AuthState
}

const appStore: ActionReducerMap<AppState> = {
  auth: authReducer
}

export const appConfig: ApplicationConfig = {
  providers: [

    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideStore(),
    provideHttpClient(
      withInterceptors([ TokenInterceptor, HandleErrorInterceptor ]),
    ),
    provideAnimationsAsync(),
    provideFlatpickrDefaults(),
    importProvidersFrom(
      FlatpickrDirective,
      MatNativeDateModule,
      StoreModule.forRoot( appStore ),
      StoreDevtoolsModule.instrument({
        maxAge: 25, // Retains last 25 states
        logOnly: true, // Restrict extension to log-only mode
        autoPause: true, // Pauses recording actions and state changes when the extension window is not open
        trace: false, //  If set to true, will include stack trace for every dispatched action, so you can see it in trace tab jumping directly to that part of code
        traceLimit: 75, // maximum stack trace frames to be stored (in case trace option was provided as true)
        connectInZone: true // If set to true, the connection is established within the Angular zone
      }),
    ),
  ],
};
