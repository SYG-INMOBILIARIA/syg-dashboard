import { Client, Contract, Lote, Proyect } from "@modules/admin/interfaces";

export interface Reservation {
  isActive:    boolean;
  userCreate:  string;
  createAt:    Date;
  id:          string;
  code:        string;
  year:        number;
  observation: string;
  lotes:       Lote[];
  clients:     Client[];
  proyect:     Proyect;
  contract:    Contract;
}
