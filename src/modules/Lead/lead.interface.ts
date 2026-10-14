import { CallOutcome, LeadActivityType, LeadStatus } from "@prisma/client";

export interface TCreateLeadPayload {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  country?: string;
  serviceId?: string;
  referralName?: string;
  status?: LeadStatus;
  assignedToId?: string;
  createdById?: string;
  createdByName?: string;
}

export interface TUpdateLeadPayload {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  serviceId?: string | null;
  referralName?: string;
  status?: LeadStatus;
  assignedToId?: string | null;
}

export interface TCreateLeadActivityPayload {
  activityType: LeadActivityType;
  callOutcome?: CallOutcome;
  notes?: string;
  nextFollowUp?: string | Date;
  statusUpdate?: LeadStatus;
  performedById?: string;
  performedByName?: string;
}

export interface TLeadFilterRequest {
  searchTerm?: string;
  status?: LeadStatus;
  serviceId?: string;
  assignedToId?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
}
