import { Lote } from '.';

export interface ContractLotesBusied {
  createAt: Date;
  id:       string;
  code:     string;
  lotes:    Lote[];
}
