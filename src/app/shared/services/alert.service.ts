import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

export type IconAlert = 'success' | 'error' | 'question' | 'info' | 'warning';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  showAlert( title?: string, message?: string, icon: IconAlert = 'error' ) {
    return Swal.fire({
      title: title ?? 'Error!',
      text: message,
      icon,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#3b82f6',
    });
  }

  showLoading() {
    return Swal.fire({
      backdrop: true,
      showConfirmButton: false,
      html: `
        <div class="p-2">
          <div style=" height: 70px;  " >
            <span class="custom_loader"></span>
          </div>
          <span class="text-xl">
            Espere por favor . . .
          </span>
        </div>
      `,
    });
  }

  close() {
    Swal.close();
  }

  showConfirmAlert( text?: string, title = '¿Está seguro de continuar?' ) {
    return Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      cancelButtonColor: '#d33',
      cancelButtonText: 'No',
      confirmButtonColor: '#364574',
      confirmButtonText: 'Sí!'
    });
  }

}
