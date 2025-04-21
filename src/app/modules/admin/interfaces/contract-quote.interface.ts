import { Contract } from ".";

export interface ContractQuote {
  isActive:              boolean;
  userCreate:            string;
  createAt:              Date;
  id:                    string;
  code:                  string;
  year:                  number;
  paymentDate:           Date;
  amountToPay:           number;
  totalPaid:             number;
  order:                 number;
  isPaid:                boolean;
  isExoneratedTardiness: boolean;
  paidAt:                null;
  contract:              Contract;
  tardinessAmount:       number;
  totalDebt:       number;
}
