import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { AppState } from '@app/app.config';
import { Store } from '@ngrx/store';
import { Subscription, filter } from 'rxjs';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'bread-crumbs',
  // standalone: true,
  // imports: [
  //   RouterModule
  // ],
  templateUrl: './bread-crumbs.component.html',
  styles: ``,
})
export class BreadCrumbsComponent implements OnInit, OnDestroy  {

  private _authRx$?: Subscription;
  private _store = inject<Store<AppState>>( Store );

  private _route$?: Subscription;

  private _router = inject( Router );
  private _activatedRoute = inject( ActivatedRoute );

  private _homeBreadcrumb = signal<Breadcrumb>({ label: 'Dashboard', url: '/dashboard/home' })  ;
  public get homeBreadcrumb() { return this._homeBreadcrumb(); }


  breadcrumbs: Breadcrumb[] = [];

  get breadcrumbsTotal() { return this.breadcrumbs.length; }

  ngOnInit(): void {

    this._listenAuthRx();

    this._route$ = this._router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.breadcrumbs = this._buildBreadcrumbs( this._activatedRoute.root );
    });

  }

  private _listenAuthRx() {
    this._authRx$ = this._store.select('auth').subscribe( state  => {

      const { userAuthenticated, webUrlPermissionMethods } = state;

      // this._webUrlPermissionMethods.set( webUrlPermissionMethods );

      if ( userAuthenticated ) {

        const { client } = userAuthenticated;

        if ( client ) {

          this._homeBreadcrumb.set({ label: 'Panel administrativo', url: `/dashboard/overview-client` });
        } else {
          this._authRx$?.unsubscribe();
        }

      } else {
        this._authRx$?.unsubscribe();
      }

    });
  }

  private _buildBreadcrumbs( route: ActivatedRoute, url: string = '', breadcrumbs: Breadcrumb[] = []): Breadcrumb[] {
    const children: ActivatedRoute[] = route.children;

    console.log( 'Children:', children );
    for (const child of children) {


      const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      console.log('Route URL:', routeURL);

      const label = child.snapshot.data['title'];
      if (label && !breadcrumbs.some( b => b.label == label )) {
        breadcrumbs.push({ label, url });
      }

      return this._buildBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  ngOnDestroy(): void {
    this._route$?.unsubscribe();
    this._authRx$?.unsubscribe();
  }

}
