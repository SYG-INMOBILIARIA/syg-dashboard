
export interface IdentityDocument {
  isActive:         boolean;
  userCreate:       null;
  createAt:         Date;
  id:               string;
  longDescription:  string;
  shortDescription: string;
  longitude:        number;
  isLongitudeExact: boolean;
  isAlphaNumeric:   boolean;
}
