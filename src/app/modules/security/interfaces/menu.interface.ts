
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

  children: Menu[];

}

export interface Badge {
  id:      string;
  variant: string;
  text:    string;
}
