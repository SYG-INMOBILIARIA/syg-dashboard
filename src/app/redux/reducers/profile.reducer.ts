import { createReducer, on } from '@ngrx/store';
import * as profileActions from '../actions/profile.actions';
import { User } from '@modules/security/interfaces';
import { SellerPayment } from '../../dashboard/pages/profile/interfaces/seller-payment.interface';

export interface ProfileState {
    userProfile: User | null,
    profits: number,
    totalPayments: number,
    totalCommissions: number,
    lastPayment: SellerPayment | null,
};

const initialState: ProfileState = {
  userProfile: null,
  profits: 0,
  totalPayments: 0,
  totalCommissions: 0,
  lastPayment: null
};

const _profileReducer = createReducer(
  initialState,
  on(
    profileActions.onLoadUserProfile,
    (state, { userProfile }) => ({...state, userProfile, profits: userProfile.profits }),
  ),

  on(
    profileActions.onLoadPaymentIndicators,
    (state, { totalCommissions, totalPayments }) => ({...state, totalCommissions, totalPayments }),
  ),

  on(
    profileActions.onSubstractProfits,
    (state, { amount }) => {

      return {
        ...state,
        profits: state.profits - amount,
        totalPayments: state.totalPayments + amount
      };
    },
  ),

  on(
    profileActions.onLoadLastPayment,
    (state, { lastPayment }) => ({...state, lastPayment }),
  ),

  on(
    profileActions.onResetProfile,
    () => ({
      userProfile: null,
      profits: 0,
      totalPayments: 0,
      totalCommissions: 0,
      lastPayment: null
    }),
  ),

);


export function profileReducer( state: any, action: any ) {
  return _profileReducer( state, action );
}
