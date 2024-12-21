export interface LoteBody {
  id: string;
  mz: string;
  block: string;
  ubication: string;
  squareMeters: number;
  price: number;
  loteStatus: string;
  centerCoords: number[];
  polygonCoords: number[][];
  proyectId: string;
}
