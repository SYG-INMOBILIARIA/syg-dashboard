import { ContractQuote } from ".";

export interface ListContractQuoteResponse {
  contractQuotes: ContractQuote[];
  total:          number;
}
