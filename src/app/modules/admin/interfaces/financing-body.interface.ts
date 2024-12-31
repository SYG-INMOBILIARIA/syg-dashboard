export interface FinancingBody {
  id: string;
  name: string;
  financingType: string;
  initial: number;
  quotas: QuotaBody[];
  proyectId: string;
}

export interface QuotaBody {
  id: string;
  numberOfQuotes: number;
  interestPercent: number;
}
