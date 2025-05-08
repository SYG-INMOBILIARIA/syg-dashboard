import { Seller } from ".";

export interface ListSellersResponse {
  sellers: Seller[];
  total:    number;
}