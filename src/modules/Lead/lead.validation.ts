import { z } from "zod";
import { CallOutcome, LeadActivityType, LeadStatus } from "@prisma/client";

const leadStatusEnum = z.nativeEnum(LeadStatus);
const leadActivityTypeEnum = z.nativeEnum(LeadActivityType);
const callOutcomeEnum = z.nativeEnum(CallOutcome);

const createLeadZodSchema = z.object({
  body: z.object({
    fullName: z.string({ required_error: "Full name is required" }).min(1, "Full name cannot be empty"),
    phone: z.string({ required_error: "Phone/WhatsApp number is required" }).min(1, "Phone number cannot be empty"),
    email: z.string().email("Invalid email format").optional().or(z.literal("")),
    address: z.string().optional(),
    country: z.string().optional(),
    serviceId: z.string().uuid("Invalid service ID").optional().or(z.literal("")),
    referralName: z.string().optional(),
    status: leadStatusEnum.optional(),
    assignedToId: z.string().uuid("Invalid staff ID").optional().or(z.literal("")),
    createdByName: z.string().optional(),
    nextFollowUpDate: z.string().optional().nullable(),
    clientCode: z.string().optional().nullable(),
    entryNumber: z.number().optional().nullable(),
    leadSource: z.string().optional().nullable(),
    whatClientWants: z.string().optional().nullable(),
    resumeUrl: z.string().optional().nullable(),
    profileAssessment: z.string().optional().nullable(),
    meetingScheduled: z.string().optional().nullable(),
    meetingDateTime: z.string().optional().nullable(),
    meetingDateTimeStr: z.string().optional().nullable(),
    meetingLocation: z.string().optional().nullable(),
    priority: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    evaluationNotes: z.string().optional().nullable(),
  }),
});

const updateLeadZodSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional().nullable().or(z.literal("")),
    address: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    serviceId: z.string().uuid().optional().nullable().or(z.literal("")),
    referralName: z.string().optional().nullable(),
    status: leadStatusEnum.optional(),
    assignedToId: z.string().uuid().optional().nullable().or(z.literal("")),
    nextFollowUpDate: z.string().optional().nullable(),
    isFollowUpDone: z.boolean().optional(),
    clientCode: z.string().optional().nullable(),
    entryNumber: z.number().optional().nullable(),
    leadSource: z.string().optional().nullable(),
    whatClientWants: z.string().optional().nullable(),
    resumeUrl: z.string().optional().nullable(),
    profileAssessment: z.string().optional().nullable(),
    meetingScheduled: z.string().optional().nullable(),
    meetingDateTime: z.string().optional().nullable(),
    meetingDateTimeStr: z.string().optional().nullable(),
    meetingLocation: z.string().optional().nullable(),
    priority: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    evaluationNotes: z.string().optional().nullable(),
  }),
});

const createLeadActivityZodSchema = z.object({
  body: z.object({
    activityType: leadActivityTypeEnum,
    callOutcome: callOutcomeEnum.optional().nullable(),
    notes: z.string().optional().nullable(),
    nextFollowUp: z.string().optional().nullable(),
    statusUpdate: leadStatusEnum.optional().nullable(),
    performedById: z.string().uuid().optional().nullable(),
    performedByName: z.string().optional().nullable(),
    isFollowUpDone: z.boolean().optional(),
  }),
});

const completeFollowUpZodSchema = z.object({
  body: z.object({
    notes: z.string().optional().nullable(),
    outcome: z.string().optional().nullable(),
    nextFollowUpDate: z.string().optional().nullable(),
  }),
});

const assignLeadZodSchema = z.object({
  body: z.object({
    assignedToId: z.string().uuid().nullable().optional().or(z.literal("")),
  }),
});

export const LeadValidation = {
  createLeadZodSchema,
  updateLeadZodSchema,
  createLeadActivityZodSchema,
  completeFollowUpZodSchema,
  assignLeadZodSchema,
};
