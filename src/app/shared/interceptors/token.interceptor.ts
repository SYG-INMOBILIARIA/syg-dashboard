import { HttpEvent, HttpHandlerFn, HttpRequest } from "@angular/common/http";
import { Observable } from "rxjs";

export function TokenInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const token = localStorage.getItem('token') ?? 'xD';
  const reqWithHeader = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${ token }`),
  });

  return next(reqWithHeader);
}
