import { Reservation } from "./reservation.interface";

export interface ListReservationsResponse {
  reservations: Reservation[];
  total:        number;
}



