import { Seller } from "@modules/admin/interfaces";
import { Visitor } from "../../visitors/interfaces";

export interface Visit {
  isActive:    boolean;
  userCreate:  string;
  createAt:    Date;
  id:          string;
  visitDate:   Date;
  visitStatus: string;
  observation: string;
  visitors:    Visitor[];
  sellerUser:  Seller;
}
