export interface SellerIndicatorsResponse {
  income:            Income;
  totalEarnings:     number;
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
