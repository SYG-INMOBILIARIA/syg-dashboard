import { Lote } from "@modules/admin/interfaces";

export interface LoteDialogResponse {

  lotes: Lote[];
  action: 'created' | 'updated';

}
