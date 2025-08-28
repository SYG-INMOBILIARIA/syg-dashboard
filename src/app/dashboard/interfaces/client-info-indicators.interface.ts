
export interface ClientProfileIndicatorsResponse {
  debtIndicators:    DebtIndicators;
  paymentIndicators: PaymentIndicators;
}

export interface DebtIndicators {
  loteAmount:       number;
  initialAmount:    number;
  interestAmount:   number;
  count:            number;
  totalDebt:        number;
  totalPaid:        number;
  countOverdueDebt: number;
}

export interface PaymentIndicators {
  lastPayment:        Date;
  operationCode:      string;
  countQuotesPending: number;
  countQuotesPaid:    number;
}
