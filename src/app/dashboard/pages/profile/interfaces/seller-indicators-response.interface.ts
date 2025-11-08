export interface SellerIndicatorsResponse {
  income:            Income;
  totalEarnings:     number;
  clientsBySeller:   ClientsBySeller;
  pendingReceivable: PendingReceivable;
}

export interface Income {
  sumCurrentMonth: number;
  sumLastMonth:    number;
}

export interface PendingReceivable {
  pendingCurrentReceivable:   number;
  pendingLastMonthReceivable: number;
}

export interface ClientsBySeller {
  currentMonth:  CurrentMonth;
  previousMonth: PreviousMonth;
}

export interface CurrentMonth {
  currentStartMonth: Date;
  currentEndMonth:   Date;
  totalClients:      number;
}

export interface PreviousMonth {
  previusStartMonth: Date;
  previusEndMonth:   Date;
  totalClients:      number;
}
