export interface IReservationBody {
  id?: string;
  clientIds: string[];
  loteIds: string[];
  proyectId: string;
  observation?: string
}
