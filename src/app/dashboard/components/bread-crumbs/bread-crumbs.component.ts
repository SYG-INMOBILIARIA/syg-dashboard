import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
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

  private _route$?: Subscription;

  private _router = inject( Router );
  private _activatedRoute = inject( ActivatedRoute );

  breadcrumbs: Breadcrumb[] = [];

  get breadcrumbsTotal() { return this.breadcrumbs.length; }

  ngOnInit(): void {

    this._route$ = this._router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.breadcrumbs = this._buildBreadcrumbs( this._activatedRoute.root );
    });

  }

  private _buildBreadcrumbs( route: ActivatedRoute, url: string = '', breadcrumbs: Breadcrumb[] = []): Breadcrumb[] {
    const children: ActivatedRoute[] = route.children;

    for (const child of children) {
      const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      const label = child.snapshot.data['title'];
      if (label) {
        breadcrumbs.push({ label, url });
      }

      return this._buildBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  ngOnDestroy(): void {
      this._route$?.unsubscribe();
  }

}
