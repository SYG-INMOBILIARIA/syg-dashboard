export interface ContractPaymentBody {
  id?: string;
  contractId: string;
  paymentMethodId: string;
  operationCode: string;
  amount: number;
  observation: string;
}
