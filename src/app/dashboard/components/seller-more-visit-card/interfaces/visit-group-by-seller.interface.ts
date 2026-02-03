export interface VisitGroupBySeller {
  months: string[];
  series: Series[];
}

export interface Series {
  sellerId:   string;
  sellerName: string;
  series:     number[];
}
