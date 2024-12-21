import { UserAuthenticated } from "./user-authenticated.interface";

export interface AuthResponse {
  userAuthenticated: UserAuthenticated;
  token:             string;
}

