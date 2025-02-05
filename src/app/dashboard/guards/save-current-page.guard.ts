import { CanMatchFn } from '@angular/router';

export const saveCurrentPageGuard: CanMatchFn = (route, segments) => {

  const urlToNavigate = segments.reduce(
    (accumulaor, current) => accumulaor+= `/${current.path}`, ''
  );

  if( urlToNavigate == '/404' ) {
    localStorage.setItem('currentPage', urlToNavigate);
    return true;
  }

  // if( urlToNavigate == '/401' ) {
  //   localStorage.setItem('currentPage', '/401');
  //   return true;
  // }

  localStorage.setItem('currentPage', `/dashboard${urlToNavigate}`);

  return true;
};
