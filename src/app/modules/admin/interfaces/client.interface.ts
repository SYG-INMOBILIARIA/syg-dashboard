import { IdentityDocument } from ".";

export interface Client {
  isActive:         boolean;
  userCreate:       null;
  createAt:         Date;
  id:               string;
  name:             null | string;
  surname:          null | string;
  bussinessName:    null | string;
  fullname:         string;
  personType:       PersonType;
  identityNumber:   string;
  birthDate:        Date;
  email:            string;
  phone:            string;
  secondaryPhone:   null;
  address:          string;
  gender:           Gender;
  civilStatus:      string;
  identityDocument: IdentityDocument;
  clientStatus:     ClientStatus;
}

export enum ClientStatus {
  Finalized = 'FINALIZED',
  Pending = 'PENDING',
  NotFinalized = 'NOT-FINALIZED',
}

export enum Gender {
  Men = "MEN",
  Women = "WOMEN",
}


export enum PersonType {
  JuridicPerson = "JURIDIC_PERSON",
  NaturalPerson = "NATURAL_PERSON",
}
