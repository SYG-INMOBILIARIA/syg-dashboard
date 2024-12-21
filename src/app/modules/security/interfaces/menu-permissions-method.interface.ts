import { Badge } from ".";

export interface MenuPermissionsMethod {

  id:             string;
  label:          string;
  iconClass:      string;
  parentId:       null | string;
  haveBadge:      boolean;
  badge:          Badge | null;
  level:          number;

  children: MenuPermissionsMethod[];

  menuMethods: MenuMethod[];

  selected: boolean;

}

export interface MenuMethod {

  id?:        string | null;
  label:     string;
  method:     string;
  selected:   boolean;

}
