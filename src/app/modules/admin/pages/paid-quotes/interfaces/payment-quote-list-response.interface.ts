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
}

