import { IdentityDocument, PersonType } from "@modules/admin/interfaces";

export interface Visitor {
  isActive:            boolean;
  userCreate:          string;
  createAt:            Date;
  id:                  string;
  name:                string;
  surname:             string;
  bussinessName:       string;
  legalRepresentative: string;
  fullname:            string;
  personType:          PersonType;
  identityNumber:      string;
  email:               string;
  phone:               string;
  gender:              string;
  identityDocument:    IdentityDocument;
}
