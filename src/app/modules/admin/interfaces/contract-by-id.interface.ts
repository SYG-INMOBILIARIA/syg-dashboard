import { User } from "@modules/security/interfaces";
import { Client, Financing, Lote, PaymentMethod, Proyect } from ".";
import { PaymentType } from "../enum";
import { Photo } from "@shared/interfaces";

export interface ContractByID {
  isActive:             boolean;
  userCreate:           string;
  createAt:             Date;
  id:                   string;
  code:                 string;
  year:                 number;
  paymentType:          PaymentType;
  documentation:        string;
  observation:          string;
  contractSatus:        string;
  selledUserId:         string;
  loteAmount:           number;
  quotesAmount:         number;
  initialAmount:        number;
  amountToFinancing:    number;
  numberOfQuotes:       number;
  interestPercent:      number;
  interestAmount:       number;
  anulateObservation:   null;
  anulateAt:            null;
  userAnulate:          null;
  lotes:                Lote[];
  clients:              Client[];
  proyect:              Proyect;
  financing:            Financing;
  seller:               User;

  initialPaidDate:      Date;
  observationInitial:   string;
  operationCodeInitial: string;
  voucherInitial:       Photo;
  paymentMethodInitial: PaymentMethod

}
