export interface ClientBody {
  id?: string;
  name: string;
  surname: string;
  bussinessName: string;
  personType: string;
  identityDocumentId: string;
  identityNumber: string;
  birthDate: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  address: string;
  gender: string;
  civilStatus: string;

  departmentCode?: string;
  provinceCode?: string;
  districtId: string;
}
