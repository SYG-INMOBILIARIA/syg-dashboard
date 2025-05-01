import { Photo } from "@shared/interfaces";
import { RoleInherited } from ".";
import { IdentityDocument } from "../../admin/interfaces";

export interface User {
  isActive:   boolean;
  userCreate: string;
  createAt:   Date;
  id:         string;
  name:       string;
  surname:    string;
  fullname:   string;
  email:      string;
  phone:      string | null;
  roles:      RoleInherited[];
  photo:      Photo | null;

  profits:     number;

  address?: string;
  birthDate: string;
  admissionDate: string;
  identityNumber: string;

  identityDocument: IdentityDocument;
}
