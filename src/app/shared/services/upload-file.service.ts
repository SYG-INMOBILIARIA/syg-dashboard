import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { FileModule } from '@shared/types';
import { environments } from '@envs/environments';
import { firstValueFrom } from 'rxjs';
import { Photo } from '@shared/interfaces';

@Injectable({
  providedIn: 'root'
})
export class UploadFileService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  uploadFile( file: File, entityId: string, moduleFile: FileModule ): Promise<Photo> {
    try {

      const httpBody = new FormData();
      httpBody.append('file', file);
      httpBody.append('entityId', entityId);
      httpBody.append('module', moduleFile);

      return firstValueFrom<Photo>(
        this._http.post<Photo>( `${ this._baseUrl }/image/upload`, httpBody )
      );

    } catch (error) {
      throw error;
    }
  }

}
