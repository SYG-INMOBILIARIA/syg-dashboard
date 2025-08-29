import { Photo } from "@shared/interfaces";
import { AreaCompany, ExpenseType } from "../../config/interfaces";
import { PaymentMethod } from ".";

export interface Expense {
  isActive:      boolean;
  userCreate:    string;
  createAt:      Date;
  id:            string;
  amount:        number;
  expenseDate:   Date;
  sourceAccount: string | null;
  voucherId:     string;
  description:   string;
  moneyType:     string;
  photo?:         Photo;
  areaCompany:   AreaCompany;
  paymentMethod: PaymentMethod;
  expenseType:   ExpenseType;
}


