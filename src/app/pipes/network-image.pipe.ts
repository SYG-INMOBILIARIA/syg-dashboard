import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { environments } from '@envs/environments';
import { Photo } from '@shared/interfaces';

@Pipe({
  name: 'networkImage',
  standalone: true
})
export class NetworkImagePipe implements PipeTransform {

constructor(
  private readonly _sanitizer: DomSanitizer
) {}

  transform( photo: Photo | null ) {

    if( !photo ) return environments.defaultImgUrl;

    return this._sanitizer.bypassSecurityTrustUrl( photo.urlImg );

  }

}
