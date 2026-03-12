export interface PaymentQuoteBody {
  contractQuotes: any[];
  paymentDate: string;
  operationCode: string;
  amount: number;
  observation: string;
  paymentMethodId: string;

  file?: File;
  fileDocument?: File;
}
