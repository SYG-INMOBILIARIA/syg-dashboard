export interface Quota {
  isActive:         boolean;
  userCreate:       null;
  createAt:         Date;
  id:               string;
  // initialPercent:   number;
  // initialAmountMin: number;
  // initialAmountMax: number;
  numberOfQuotes:   number;
  interestPercent:  number;
  order:            number;
}
