import { createReducer, on } from '@ngrx/store';
import * as actions from '../actions/auth.actions';
import { Permission, UserAuthenticated, WebUrlPermissionMethods } from '../../auth/interfaces';

export interface AuthState {
  userAuthenticated: UserAuthenticated | null;
  menu: Permission[];
  webUrlPermissionMethods: WebUrlPermissionMethods[];
};

const initialState: AuthState = {
  userAuthenticated: null,
  menu: [],
  webUrlPermissionMethods: []
};

const _authReducer = createReducer(
  initialState,
  on(
    actions.onLoadUserAuthenticated,
    (state, { userAuthenticated }) => ({...state, userAuthenticated}),
  ),
  on(
    actions.onLoadMenu,
    (state, { menu, webUrlPermissionMethods }) => ({...state, menu, webUrlPermissionMethods}),
  ),
  on(
    actions.onReset,
    (state) => ({
      ...state,
      menu: [],
      webUrlPermissionMethods: [],
      userAuthenticated: null
    }),
  ),
);


export function authReducer(state: any, action: any) {
  return _authReducer(state, action);
}
