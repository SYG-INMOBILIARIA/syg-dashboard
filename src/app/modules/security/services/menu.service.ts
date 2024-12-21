import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environments } from '@envs/environments';
import { Observable, map } from 'rxjs';
import { ListMenuResponse, Menu, MenuBody, MenuMoveBody } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  private readonly _baseUrl = environments.baseUrl;
  private _http = inject( HttpClient );

  getMenus() {

    let queryParams = `limit=100`;
    queryParams += `&page=1`;

    return this._http.get<ListMenuResponse>(`${ this._baseUrl }/menu?${ queryParams }`)
      .pipe(
        map( ( { menus } ) => {

          const childrenLevel3 = menus.filter( (children) => children.level == 3 && children.parentId );
          const childrenLevel2 = menus.filter( (children) => children.level == 2 && children.parentId );
          const childrenLevel1 = menus.filter( (children) => children.level == 1 && children.parentId );

          const parentLevel1 = menus.filter( (e) => e.level == 1 && !e.parentId );
          const parentLevel2 = menus.filter( (e) => e.level == 2 && !e.parentId );

          const parentAndChildren2 = parentLevel2.map( (parent) => {

            parent.children = childrenLevel3.filter( (children) => children.parentId === parent.id );

            return parent;
          } );

          const newMenus = parentLevel1.map( (parent) => {

            parent.children = [...childrenLevel2.filter( (children) => children.parentId == parent.id )];
            parent.children = [...parent.children, ...parentAndChildren2.filter( (s) => s.parentId == parent.id ) ];
            parent.children = [...parent.children, ...childrenLevel1.filter( (s) => s.parentId == parent.id ) ];

            return parent;
          } );

          return newMenus;
        } )

      );

  }

  getMenuById( id: string ): Observable<Menu> {
    return this._http.get<Menu>(`${ this._baseUrl }/menu/${ id }`);
  }

  createMenu( body: MenuBody ): Observable<Menu> {
    return this._http.post<Menu>(`${ this._baseUrl }/menu`, body );
  }

  updateMenu( id: string, body: MenuBody ): Observable<Menu> {
    return this._http.patch<Menu>(`${ this._baseUrl }/menu/${ id }`, body );
  }

  removeMenu( id: string ): Observable<Menu> {
    return this._http.delete<Menu>(`${ this._baseUrl }/menu/${ id }` );
  }

  moveMenu( body: MenuMoveBody ): Observable<Menu> {
    return this._http.put<Menu>(`${ this._baseUrl }/menu/move`, body );
  }

}
