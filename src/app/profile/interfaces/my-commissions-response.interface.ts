import { Contract, IdentityDocument } from "../../modules/admin/interfaces";

export interface MyCommissionsResponse {
  commissions: Commission[];
  total:       number;
}

export interface Commission {
  isActive:   boolean;
  userCreate: string;
  createAt:   Date;
  id:         string;
  year:       number;
  amount:     number;
  percent:    number;
  contract:   Contract;
  seller:     Seller;
}

export interface Seller {
  isActive:         boolean;
  userCreate:       string;
  createAt:         Date;
  id:               string;
  name:             string;
  surname:          string;
  fullname:         string;
  email:            string;
  phone:            null;
  address:          string;
  birthDate:        null;
  admissionDate:    null;
  logeed:           boolean;
  profits:          number;
  identityNumber:   string;
  photo:            null;
  identityDocument: IdentityDocument;
}

