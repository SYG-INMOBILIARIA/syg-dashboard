import { Photo } from "@shared/interfaces";

export interface PaymentMethod {
  isActive:    boolean;
  userCreate:  string;
  createAt:    Date;
  id:          string;
  code:        string;
  name:        string;
  description: string;
  photo?:       Photo;
}
