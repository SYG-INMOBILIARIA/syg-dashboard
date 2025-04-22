import { ContractQuote } from ".";

export interface ListContractQuoteResponse {
  contractQuotes: ContractQuote[];
  total:          number;
  resumen:        QuotesResumen;
}



export interface QuotesResumen {
  totalPaid:      number;
  totalTardiness: number;
  lotesDebt:      number;
  totalDebt:      number;
  totalQuotes:    number;
}
