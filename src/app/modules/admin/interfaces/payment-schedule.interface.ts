import { Client, Lote, ContractQuote } from ".";

export interface ContractPaymentScheduleResponse {
  lotes:             Lote[];
  client:            Client;
  loteAmount:        number;
  initialAmount:     number;
  amountToFinancing: number;
  contractQuotes:    ContractQuote[];
}




