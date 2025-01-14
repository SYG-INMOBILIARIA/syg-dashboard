import { Client, Lote } from ".";

export interface PaymentSchedule {
  lotes:             Lote[];
  client:            Client;
  loteAmount:        number;
  initialAmount:     number;
  amountToFinancing: number;
  schedule:          Schedule[];
}

export interface Schedule {
  quota:       string;
  paymentDate: Date;
  year:        number;
  quotaAmount: number;
}
