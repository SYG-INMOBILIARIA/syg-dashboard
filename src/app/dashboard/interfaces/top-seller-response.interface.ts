export interface TopSellerResponse {
  startDate: Date;
  endDate:   Date;
  sellers:   TopSeller[];
}

export interface TopSeller {
  selledUserId:         string;
  seller:               UserSeller;
  contractsCount:       number;
  soldLots:             number;
  totalGeneratedAmount: number;
}

export interface UserSeller {
  id:       string;
  name:     string;
  surname:  string;
  fullname: string;
  email:    string;
  phone:    null;
}
