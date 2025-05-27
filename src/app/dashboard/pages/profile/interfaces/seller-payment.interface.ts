import { Photo } from "@shared/interfaces";
import { PaymentMethod } from '@modules/admin/interfaces/payment-method.interface';
import { IdentityDocument } from "../../../../auth/interfaces";

export interface SellerPayment {
  isActive:      boolean;
  userCreate:    string;
  createAt:      Date;
  id:            string;
  operationCode: string;
  paymentDate:   Date;
  amount:        number;
  observation:   string;
  photo:         Photo | null;
  paymentMethod: PaymentMethod;
  userCreated:   UserCreated;
}


export interface UserCreated {
  id:               string;
  fullname:         string;
  email:            string;
  photo:            Photo;
  identityDocument: IdentityDocument;
}
