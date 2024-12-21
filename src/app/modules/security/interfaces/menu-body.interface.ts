export interface MenuBody {
  id?: string;
  label: string;
  iconClass: string;
  webUrl: string;
  apiUrl: string;
  parentId: string;
  level: number;
  order: number;
  isHidden: boolean;
  haveTranslate: boolean;
  haveBadge: boolean;
  labelTranslate: string | null;
  badgeClass: string | null;
  badgeText: string | null;
}
