import { Nomenclature } from "@shared/interfaces";
import { Lote, ProyectById } from ".";

export interface LoteDialogPayload {
  proyect: ProyectById;
  lotes: Lote[];
  loteStatus: Nomenclature[];
}
