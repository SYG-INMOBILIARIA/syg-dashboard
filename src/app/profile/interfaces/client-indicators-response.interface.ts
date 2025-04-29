export interface ClientIndicators {
  totalClients:          TotalClients;
  totalClientsFinalized: TotalClients;
  totalClientsPending:   TotalClients;
}

export interface TotalClients {
  countClientsCurrentMonth: number;
  countClientsLastMonth:    number;
}
