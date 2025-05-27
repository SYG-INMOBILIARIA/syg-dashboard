
export interface ClientProfileIndicatorsResponse {
  debtIndicators:    DebtIndicator[];
  paymentIndicators: PaymentIndicators;
}

export interface DebtIndicator {
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
