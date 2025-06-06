import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { NavigationExtras, Router } from "@angular/router";
import { AlertService } from "@shared/services/alert.service";
import { Observable, catchError } from "rxjs";

export function HandleErrorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {

  const router = inject( Router );
  const alertService = inject( AlertService );

  return next(req)
    .pipe(
      catchError( (err: HttpErrorResponse) => {
        // console.log({ err });

        const navigationExtras: NavigationExtras = { state: { error: err.error } };

        switch (err.status) {
          case 500:
            router.navigateByUrl( '/500', navigationExtras );
            break;

            case 404:
              router.navigateByUrl( '/404', navigationExtras );
              break;

              case 401:
                router.navigateByUrl( '/auth', navigationExtras );
                break;


          default:
            alertService.close();
            alertService.showAlert( err.error.message );
            break;
        }
        throw err;
      })

    );
}
