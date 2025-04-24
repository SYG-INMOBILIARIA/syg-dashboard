
export interface ExpenseBody {
  id?:           string;
  amount:        number;
  expenseDate:   string;
  sourceAccount: string;
  expenseType:   string;
  voucherId:     string;
  description:   string;
  moneyType:     string;
  areaCompanyId: string;
}
