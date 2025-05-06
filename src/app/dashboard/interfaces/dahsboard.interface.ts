export interface DashboardStats {
  activeVendors: number;
  totalClients: number;
  convertedClients: number;
  conversionRatio: number;
  totalCommissions: number;
  totalPayments: number;
  unpaidCommissions: number;
  overdueGoals: number;
  clientsNeedingAttention: number;
}

export interface SellerPerformance {
  name: string;
  convertedClients: number;
  conversionRatio: number;
  commissionsGenerated: number;
  achievements: Achievement[];
}

export interface Achievement {
  type: 'success' | 'warning' | 'info';
  description: string;
}

export interface MonthlyCommissions {
  month: string;
  amount: number;
}

export interface ClientStatus {
  status: string;
  count: number;
}

export interface RecentActivity {
  action: 'info' | 'success' | 'warning' | 'error';
  description: string;
  timestamp: string;
}