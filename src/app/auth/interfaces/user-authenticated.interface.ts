import { Photo } from "@shared/interfaces";

export interface UserAuthenticated {
  id:          string;
  fullname:    string;
  email:       string;
  roles:       Role[];
  photo?:      Photo | null;
}

export interface Role {
  id:   string;
  name: string;
  code: string;
}
