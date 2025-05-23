export interface ExpenseType {
  isActive:    boolean;
  userCreate:  string | null;
  createAt:    Date;
  id:          string;
  name:        string;
  description: string;
}
