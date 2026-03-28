import { DateFilterMode } from "../services/contract-filter-validator.service";

export interface FilterContractBody {
  searchText: string;
  dateMode: DateFilterMode;

  equalToDate: string;
  greaterToDate: string;
  lessToDate: string;
}
