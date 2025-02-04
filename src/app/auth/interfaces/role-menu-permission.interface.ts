export interface RoleMenuPermission {
  permissions: Permission[];
}

export interface Permission {
  isActive:   boolean;
  userCreate: null;
  createAt:   Date;
  id:         string;
  methods:    Method[];
  menu:       Menu;

  children: Permission[];
}

export interface Menu {
  isActive:       boolean;
  userCreate:     null;
  createAt:       Date;
  id:             string;
  label:          string;
  labelTranslate: null;
  haveTranslate:  boolean;
  isHidden:       boolean;
  iconClass:      string;
  webUrl:         string;
  apiUrl:         string;
  parentId:       null | string;
  order:          number;
  level:          number;
  haveBadge:      boolean;
  badge:          Badge | null;
}

export interface Badge {
  id:      string;
  variant: string;
  text:    string;
}

export enum Method {
  Delete = "DELETE",
  Get = "GET",
  GetID = "GET/:ID",
  Patch = "PATCH",
  Post = "POST",
}
