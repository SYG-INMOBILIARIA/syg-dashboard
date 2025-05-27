import { createAction, props } from "@ngrx/store";
import { Client } from "@modules/admin/interfaces";

export const onLoadClientProfile = createAction(
  '[profileClient] onLoadClientProfile',
  props<{ client: Client }>()
);

export const onLoadClientProfileInProgress = createAction(
  '[profileClient] onLoadClientProfileInProgress'
);

export const onLoadClientProfileInFinish = createAction(
  '[profileClient] onLoadClientProfileInFinish'
);

export const onResetClientProfile = createAction(
  '[profileClient] onResetClientProfile'
);
