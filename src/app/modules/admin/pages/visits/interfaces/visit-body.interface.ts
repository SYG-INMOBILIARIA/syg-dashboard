export interface VisitBody {
  id?: string;
  visitorsIds: string[];
  visitDate: Date;
  visitStatus: string;
  sellerUserId: string;
  observation ?: string;
}
