import { Client, Lote, Proyect } from ".";
import { PaymentType } from "../enum";

export interface Contract {
  isActive:           boolean;
  userCreate:         string;
  createAt:           Date;
  id:                 string;
  contractDate:       Date;
  code:               string;
  year:               number;
  paymentType:        PaymentType;
  documentation:      string;
  observation:        string;
  contractSatus:      string;
  selledUserId:       string;
  loteAmount:         number;
  quotesAmount:       number;
  initialAmount:      number;
  amountToFinancing:  number;
  numberOfQuotes:     number;
  interestPercent:    number;
  interestAmount:     number;
  anulateObservation: null;
  anulateAt:          null;
  userAnulate:        null;
  lotes:              Lote[];
  proyect:            Proyect;
  clients:            Client[];
}
