import { ServiceCategory } from "@prisma/client";

export type TServiceFilterRequest = {
  searchTerm?: string;
  category?: ServiceCategory;
  currency?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  startDate?: string;
  endDate?: string;
};

export type TCreateServicePayload = {
  name: string;
  code: string;
  category?: ServiceCategory;
  description?: string;
  baseFee: number;
  estimatedGovFee?: number;
  estimatedAttorneyFee?: number;
  estimatedThirdPartyFee?: number;
  currency?: string;
  defaultDeposit?: number;
  defaultInstallments?: number;
  estimatedDuration?: string;
  isActive?: boolean;
};

export type TUpdateServicePayload = Partial<TCreateServicePayload> & {
  isDeleted?: boolean;
};
