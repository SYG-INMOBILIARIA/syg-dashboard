import { ContractPayment } from ".";

export interface ListContractPaymentResponse {
  contractPayments: ContractPayment[];
  total:          number;
}

