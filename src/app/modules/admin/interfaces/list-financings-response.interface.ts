import { Financing } from ".";

export interface ListFinancingsResponse {
  financings: Financing[];
  total:      number;
}
