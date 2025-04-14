import { Photo } from "@shared/interfaces";
import { Contract, PaymentMethod } from ".";

export interface ContractPayment {
  isActive:      boolean;
  userCreate:    string;
  createAt:      Date;
  id:            string;
  operationCode: string;
  amount:        number;
  observation:   string;
  photo?:         Photo;
  contract:      Contract;
  paymentMethod: PaymentMethod;
}
