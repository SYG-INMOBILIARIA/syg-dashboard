import { Photo } from "@shared/interfaces";
import { Coordinate } from ".";

export interface Proyect {
  isActive:        boolean;
  userCreate:      null | string;
  createAt:        Date;
  id:              string;
  code:            string;
  name:            string;
  year:            number;
  description:     string;
  adquisitionDate: Date;
  centerCoords:    [number, number];
  photos:          Photo[];
  flatImage?:      Photo;
  polygonCoords:   Coordinate[];
  pitchMap:        number;
  bearingMap:      number;
  zoomMap:         number;
}

// export interface ProyectById extends Proyect {
//   polygonCoords:   Coordinate[];
// }

