import { Quote } from "@app/dashboard/interfaces";
import { PaymentMethod } from "@modules/admin/interfaces";
import { Photo } from "@shared/interfaces";

export interface PaymentQuoteListResponse {
  paymentsByCuote: PaymentsByCuote[];
}

export interface PaymentsByCuote {
  isActive:      boolean;
  userCreate:    string;
  createAt:      Date;
  id:            string;
  operationCode: string;
  paymentDate:   Date;
  amount:        number;
  observation:   null;
  photo:         Photo;
  documentFile:  Photo;
  paymentMethod: PaymentMethod;
  quotes:        Quote[];
  paymentQuoteDetails:       PaymentQuoteDetail[];
}


export interface IPaymentsQuoteListresponse {
  paymentQuotes: PaymentQuote[];
  total:         number;
}

export interface PaymentQuote {
  isActive:      boolean;
  userCreate:    string;
  createAt:      Date;
  id:            string;
  operationCode: string;
  paymentDate:   Date;
  amount:        number;
  observation:   string;
  photo:         Photo;
  documentFile:  Photo;
  paymentMethod: PaymentMethod;
  quotes:        Quote[];
}


export interface PaymentQuoteDetail {
  isActive:               boolean;
  userCreate:             null;
  createAt:               null;
  id:                     string;
  paymentQuoteId:         string;
  contractQuoteId:        string;
  paidAmount:             number;
  quoteDebtBeforePayment: number;
  quoteDebtAfterPayment:  number;
  quoteTotalPaidBefore:   number;
  quoteTotalPaidAfter:    number;
  wasFullyPaid:           boolean;
  orderApplied:           number;
}


