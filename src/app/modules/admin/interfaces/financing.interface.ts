import { Quota } from "./quota.interface";

export interface Financing {
  isActive:      boolean;
  userCreate:    null;
  createAt:      Date;
  id:            string;
  name:          string;
  financingType: string;
  quotas:        Quota[];
  initial: number
}
