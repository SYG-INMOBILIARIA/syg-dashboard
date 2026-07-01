export type PortfolioStatus = 'overdue' | 'current' | 'all';

export interface PortfolioClient { id: string; fullname: string; }
export interface PortfolioLote { id: string; mz: string; numberLote: string; }

export interface PortfolioContract {
  id: string;
  code: string;
  clients: PortfolioClient[];
  lotes: PortfolioLote[];
  totalDebt: number;
  overdueQuotesCount?: number;
  overdueDebt?: number;
  maxDaysLate?: number;
  pendingQuotesCount?: number;
  nextQuoteNumber?: number;
  nextPaymentDate?: string | null;
  state?: 'overdue' | 'current' | 'paid';
}

export interface PortfolioSummary {
  totalOverdueDebt?: number;
  overdueContracts?: number;
  overdueQuotes?: number;
  maxDaysLate?: number;
  currentContracts?: number;
  totalPendingDebt?: number;
  nextDueInDays?: number | null;
  allContracts?: number;
  paidContracts?: number;
}

export interface PortfolioResponse {
  contracts: PortfolioContract[];
  total: number;
  summary: PortfolioSummary;
}
