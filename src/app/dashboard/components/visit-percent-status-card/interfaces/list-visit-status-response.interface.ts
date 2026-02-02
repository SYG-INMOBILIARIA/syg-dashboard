

export interface VisitGrouped {
  months: string[];
  series: Series[];
}

export interface Series {
  status: string;
  series: number[];
}
