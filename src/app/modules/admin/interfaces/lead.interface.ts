import { PersonType } from ".";
import { IdentityDocument } from "../../../auth/interfaces";
import { User } from "../../security/interfaces";

export interface Lead {
  isActive:          boolean;
  userCreate:        string;
  createAt:          Date;
  id:                string;
  name:              string;
  surname:           string;
  bussinessName:     string;
  fullname:          string;
  personType:        PersonType;
  identityNumber:    string;
  birthDate?:        string | null;
  email:             string;
  phone:             string;
  secondaryPhone?:   string | null;
  address?:          string | null;
  gender?:           string | null;
  civilStatus?:      string | null;
  clientStatus:      string;
  leadStatus:        string;
  isClient:          boolean;
  inputChannel:      string;
  admissionDate:     Date;
  observation:       string;
  identityDocument?: IdentityDocument;
  assignedAdvisor?:  User;
}
