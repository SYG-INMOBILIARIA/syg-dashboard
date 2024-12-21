import { Marker } from "mapbox-gl";

export interface MarkerAndColor {
  marker: Marker,
  color: string;
}

export interface MarkerRaw {
  id?: string;
  color: string;
  coors: [number, number];
}
