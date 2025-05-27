import { createAction, props } from "@ngrx/store";
import { User } from "@modules/security/interfaces";
import { SellerPayment } from "../../dashboard/pages/profile/interfaces";

export const onLoadUserProfile = createAction(
  '[profileReducer] onLoadUserProfile',
  props<{ userProfile: User }>()
);


export const onSubstractProfits = createAction(
  '[profileReducer] onSubstractProfits',
  props<{ amount: number }>()
);


export const onLoadPaymentIndicators = createAction(
  '[profileReducer] onLoadPaymentIndicators',
  props<{ totalPayments: number, totalCommissions: number }>()
);


export const onLoadLastPayment = createAction(
  '[profileReducer] onLoadLastPayment',
  props<{ lastPayment: SellerPayment }>()
);


export const onResetProfile = createAction(
  '[profileReducer] onResetProfile'
);
