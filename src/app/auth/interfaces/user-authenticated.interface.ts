export interface UserAuthenticated {
  id:    string;
  email: string;
  roles: Role[];
}

export interface Role {
  id:   string;
  name: string;
  code: string;
}
