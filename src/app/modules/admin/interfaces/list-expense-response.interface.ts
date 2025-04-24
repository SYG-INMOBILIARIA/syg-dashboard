import { Expense } from ".";

export interface ListExpenseResponse {
  expenses: Expense[];
  total:    number;
}


