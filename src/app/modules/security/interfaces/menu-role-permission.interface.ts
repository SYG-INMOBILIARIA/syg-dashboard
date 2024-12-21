import { Badge } from './menu.interface';

export interface Permission {
  isActive:   boolean;
  userCreate: null;
  createAt:   Date;
  id:         string;
  method:     string;
  role:       RoleInherited;
  menu:       MenuInherited;
}

export interface MenuInherited {
  id:    string;
  label: string;
  badge: Badge;
}


export interface RoleInherited {
  id:   string;
  name: string;
}
