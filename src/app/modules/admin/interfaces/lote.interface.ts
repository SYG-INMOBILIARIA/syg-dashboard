import { Coordinate } from ".";

export interface Lote {
  isActive:        boolean;
  userCreate:      string;
  createAt:        Date;
  id:              string;
  code:            string;
  mz:              string;
  block:           string;
  ubication:       string;
  squareMeters:    number;
  price:           number;
  year:            number;
  loteStatus:      string;
  centerCoords:    [number, number];
  pitchMap:        number;
  bearingMap:      number;
  zoomMap:         number;
  photos:          any[];
  polygonCoords:   Coordinate[];
  stage:           string;
}
