import { PaymentMethod } from "@modules/admin/interfaces";

export interface ListPaymentQuoteByClientResponse {
  payments: PaymentQuote[];
  total:    number;
}

export interface PaymentQuote {
  createAt:      Date;
  id:            string;
  operationCode: string;
  paymentDate:   Date;
  amount:        number;
  observation:   string;
  photo:         Photo;
  paymentMethod: PaymentMethod;
  quotes:        Quote[];
}


export interface Photo {
  id:         string;
  urlImg:     string;
  nameImg:    string;
  module:     string;
  isActive:   boolean;
  isExternal: boolean;
}

export interface Quote {
  id:                     string;
  code:                   string;
  year:                   number;
  paymentDate:            Date;
  amountToPay:            number;
  totalPaid:              number;
  order:                  number;
  isPaid:                 boolean;
  isExoneratedTardiness:  boolean;
  contract:               PaymentMethod;
  paidAt:                 Date;
  exonerateTardinessAt:   Date;
  userExonerateTardiness: string;
}
