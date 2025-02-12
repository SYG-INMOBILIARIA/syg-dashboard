import { Nomenclature } from "@shared/interfaces";
import { Lote, Proyect } from ".";
import { WebUrlPermissionMethods } from "../../../auth/interfaces";

export interface LoteDialogPayload {
  proyect: Proyect;
  lotes: Lote[];
  loteStatus: Nomenclature[];
  webUrlPermissionMethods: WebUrlPermissionMethods[]
  loteToUpdate?: Lote;
}
