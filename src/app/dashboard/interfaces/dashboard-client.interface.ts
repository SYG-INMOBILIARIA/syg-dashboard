import { ContractQuote } from "@modules/admin/interfaces";

export interface OverviewClientIndicatorsResponse {
  paymentIndicators: PaymentIndicators;
  quotesIndicators:  QuotesIndicators;
  debtIndicators:    DebtIndicators;
  nextQuoteToPaid:   NextQuoteToPaid;
}


export interface DebtIndicators {
  totalUnpaidAmount:      number;
  lastMonthPaidAmount:    number;
  currentMonthPaidAmount: number;
  percentageDifference:   number;
}

export interface NextQuoteToPaid {
  nextQuoteToPay: ContractQuote;
  lastPaidQuote:  ContractQuote | null;
}

export interface PaymentIndicators {
  totalAmount:          number;
  currentMonthAmount:   number;
  lastMonthAmount:      number;
  percentageDifference: number;
}

export interface QuotesIndicators {
  totalUnpaidQuotes:     number;
  lastMonthUnpaidQuotes: number;
  overdueQuotes:         number;
  percentageDifference:  number;
}
