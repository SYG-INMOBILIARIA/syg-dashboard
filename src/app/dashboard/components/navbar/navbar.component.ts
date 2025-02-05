import { Component, inject } from '@angular/core';
import { SettingsService } from '@shared/services/settings.service';

@Component({
  selector: 'navbar',
  templateUrl: './navbar.component.html',
  styles: ``
})
export class NavbarComponent {

  get isDarkMode() { return this._settingsService.isDarkMode; }
  private _settingsService = inject( SettingsService );

  onChangeTheme() {

    const isDarkMode = this.isDarkMode();

    if( isDarkMode ) {
      this._settingsService.setTheme = 'ligth';
      return;
    }

    this._settingsService.setTheme = 'dark';

  }

}
