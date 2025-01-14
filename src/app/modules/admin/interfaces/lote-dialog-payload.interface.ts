import { Nomenclature } from "@shared/interfaces";
import { Lote, Proyect } from ".";

export interface LoteDialogPayload {
  proyect: Proyect;
  lotes: Lote[];
  loteStatus: Nomenclature[];

  loteToUpdate?: Lote;
}
