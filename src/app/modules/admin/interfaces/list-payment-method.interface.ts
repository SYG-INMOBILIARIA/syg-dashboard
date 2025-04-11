import { PaymentMethod } from ".";

export interface ListPaymentsMethodResponse {
  paymentsMethod: PaymentMethod[];
  total:          number;
}

