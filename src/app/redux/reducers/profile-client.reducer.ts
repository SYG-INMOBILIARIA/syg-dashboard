import { createReducer, on } from '@ngrx/store';
import * as actions from '../actions/profile-client.actions';
import { Client } from '@modules/admin/interfaces';

export interface ProfileClientState {
    client: Client | null;
    isLoading: boolean;
};

const initialState: ProfileClientState = {
  client: null,
  isLoading: false
};

const _profileClientreducer = createReducer(
  initialState,
  on(
    actions.onLoadClientProfile,
    (state, { client }) => ({...state, client, isLoading: false}),
  ),

  on(
    actions.onLoadClientProfileInProgress,
    (state) => ({ ...state, isLoading: true }),
  ),

  on(
    actions.onLoadClientProfileInFinish,
    (state) => ({ ...state, isLoading: false }),
  ),

  on(
    actions.onResetClientProfile,
    (state) => ({ ...state, isLoading: false, client: null }),
  ),

);

export function profileClientreducer(state: any, action: any) {
  return _profileClientreducer(state, action);
}
