import { Injectable, computed, signal } from '@angular/core';


export type AppTheme = 'ligth' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private _appTheme = signal<AppTheme>('ligth');
  public readonly isDarkMode = computed( () => this._appTheme() == 'dark' );

  set setTheme( value: AppTheme ) {

    this._appTheme.set( value );
    const isDarkMode = this.isDarkMode();

    if( isDarkMode ) {
      localStorage.setItem('appTheme', 'dark');
      document.documentElement.classList.add('dark');
      return;
    }

    localStorage.setItem('appTheme', 'ligth');
    document.documentElement.classList.remove('dark');
  }

}
