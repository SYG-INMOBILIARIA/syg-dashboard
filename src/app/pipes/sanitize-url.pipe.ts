import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { environments } from '@envs/environments';

@Pipe({
  name: 'sanitizeUrl',
  standalone: true
})

export class SanitizeUrlPipe implements PipeTransform {

  private _domSanitizer = inject( DomSanitizer );

  transform( url: string) {

    if( !url ) return environments.defaultImgUrl;

    return this._domSanitizer.bypassSecurityTrustResourceUrl( url );

  }
}
