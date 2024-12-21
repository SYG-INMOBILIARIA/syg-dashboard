import { Photo } from "@shared/interfaces";
import { RoleInherited } from ".";

export interface User {
  isActive:   boolean;
  userCreate: string;
  createAt:   Date;
  id:         string;
  name:       string;
  surname:    string;
  fullname:   string;
  email:      string;
  phone:      null;
  roles:      RoleInherited[];
  photo:      Photo | null;
}
