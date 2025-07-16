export interface DebtsByStatus {
  summary:            Summary;
  quotesByStatus:     QuotesByStatus;
  quotesByDateStatus: QuotesByDateStatus;
  statistics:         Statistics;
}

export interface QuotesByDateStatus {
  overdue: Current;
  current: Current;
}

export interface Current {
  count:       number;
  description: string;
}

export interface QuotesByStatus {
  paid:   Paid;
  unpaid: Paid;
}

export interface Paid {
  count:      number;
  percentage: number;
}

export interface Statistics {
  paymentProgress:        number;
  averageQuotesPerStatus: number;
}

export interface Summary {
  totalQuotes:   number;
  totalExpected: number;
  totalPaid:     number;
  totalDebt:     number;
}
