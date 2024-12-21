export interface MenuMoveBody {
  id: string;
  parentId: string | null;
  level: number;
  order: number;
}
