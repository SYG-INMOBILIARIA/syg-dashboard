import { User } from "@modules/security/interfaces";
import { IdentityDocument } from ".";

// export interface Client {
//   isActive:         boolean;
//   userCreate:       null;
//   createAt:         Date;
//   id:               string;
//   name:             null | string;
//   surname:          null | string;
//   bussinessName:    null | string;
//   fullname:         string;
//   personType:       PersonType;
//   identityNumber:   string;
//   birthDate:        Date;
//   email:            string;
//   phone:            string;
//   secondaryPhone:   null;
//   address?:          string;
//   gender:           Gender;
//   civilStatus:      string;
//   identityDocument?: IdentityDocument;
//   clientStatus:     ClientStatus;
// }

export enum ClientStatus {
  Finalized = 'FINALIZED',
  Pending = 'PENDING',
  NotFinalized = 'NOT-FINALIZED',
}

// export enum Gender {
//   Men = "MEN",
//   Women = "WOMEN",
// }

export enum PersonType {
  JuridicPerson = "JURIDIC_PERSON",
  NaturalPerson = "NATURAL_PERSON",
}


export interface Client {
  isActive:         boolean;
  userCreate:       string;
  createAt:         Date;
  id:               string;
  name:             string | null;
  surname:          string | null;
  bussinessName:    string | null;
  fullname:         string;
  personType:       PersonType;
  identityNumber:   string | null;
  birthDate:        Date | null;
  email:            string;
  phone:            string;
  secondaryPhone?:  string | null;
  address?:         string | null;
  gender?:          string | null;
  civilStatus?:     string | null;
  clientStatus:     ClientStatus;
  leadStatus:       string;
  isClient:         boolean;
  inputChannel:     string;
  admissionDate:    Date | null;
  observation:      string | null;
  identityDocument: IdentityDocument | null;
  assignedAdvisor:  AssignedAdvisor;

  legalRepresentative?: string;
  ubigeo?:              Ubigeo;
  user?:                User;
}

export interface AssignedAdvisor {
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



export interface Aux {
  clients: Client[];
  total:   number;
}



export interface Ubigeo {
  isActive:       boolean;
  userCreate:     null;
  createAt:       Date;
  id:             string;
  departmentCode: string;
  provinceCode:   string;
  code:           string;
  ubigeo:         string;
  ubigeoName:     string;
  district:       string;
  countryCode:    string;
}
