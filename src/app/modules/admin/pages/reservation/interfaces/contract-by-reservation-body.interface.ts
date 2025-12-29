export interface ContractByReservationBody {
  clientId: string;
  documentation: string;
  observation: string;
  proyectId: string;
  loteIds: string[];

  paymentType: string;
  financingId: string;
  quotaId: string;
  initialAmount: number;

  numberOfQuotesPaid: number;
  contractDate?: string;
}
