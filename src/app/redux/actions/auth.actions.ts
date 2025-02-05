import { createAction, props } from "@ngrx/store";
import { Permission, UserAuthenticated, WebUrlPermissionMethods } from "../../auth/interfaces";

export const onLoadUserAuthenticated = createAction(
  '[authReducer] onLoadUserAuthenticated',
  props<{ userAuthenticated: UserAuthenticated }>()
);

export const onLoadMenu = createAction(
  '[authReducer] onLoadMenu',
  props<{ menu: Permission[], webUrlPermissionMethods: WebUrlPermissionMethods[] }>()
);

export const onReset = createAction(
  '[authReducer] onReset'
);
