import { IdentityDocument } from ".";

export interface ListIdentityDocumentResponse {
  identityDocuments: IdentityDocument[];
  total:             number;
}
