export interface SellerPaymentBody {
  id?: string;
  sellerUserId: string;
  paymentDate: string;
  operationCode: string;
  amount: number;
  observation?: string;
  paymentMethodId: string;
}
