import { Role } from "./role.interface";

export interface ListRoleResponse {
  roles: Role[];
  total: number;
}
