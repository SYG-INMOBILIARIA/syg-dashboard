import { Client } from "@modules/admin/interfaces";
import { Photo } from "@shared/interfaces";

export interface UserAuthenticated {
  id:               string;
  fullname:         string;
  email:            string;
  phone:            string;
  address:          string;
  birthDate:        Date;
  admissionDate:    Date;
  identityNumber:   string;
  roles:            Role[];
  photo?:            Photo | null;
  identityDocument: IdentityDocument;
  client?:           Client | null;
}

export interface Role {
  id:   string;
  name: string;
  code: string;
}

export interface IdentityDocument {
  isActive:         boolean;
  userCreate:       null;
  createAt:         Date;
  id:               string;
  longDescription:  string;
  shortDescription: string;
  longitude:        number;
  isLongitudeExact: boolean;
  isAlphaNumeric:   boolean;
}
