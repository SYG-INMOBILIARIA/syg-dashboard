import { Photo } from "@shared/interfaces";
import { AreaCompany } from "../../config/interfaces";

export interface Expense {
  isActive:      boolean;
  userCreate:    string;
  createAt:      Date;
  id:            string;
  amount:        number;
  expenseDate:   Date;
  sourceAccount: string | null;
  expenseType:   string;
  voucherId:     string;
  description:   string;
  moneyType:     string;
  photo?:         Photo;
  areaCompany:   AreaCompany;
}


