export interface ContractFormOne {
  clientId: string;
  documentation: string;
  observation: string;
}

export interface ContractFormTwo {
  proyectId: string;
  loteIds: string[];
}

export interface ContractFormThree {
  paymentType: string;
  financingId: string;
  quotaId: string;
  initialAmount: number;

  numberOfQuotesPaid: number;
  contractDate?: string;
}


export interface ContractFormFour {
  initialPaidDate: string;
  paymentMethodInitialId: number;
  operationCodeInitial: string;
  observationInitial: string;
}
