import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";

type TAuditInput = {
  actorId?: string;
  actorEmail?: string;
  action: string;
  targetEntity: string;
  targetId: string;
  beforeValue?: Prisma.InputJsonValue;
  afterValue?: Prisma.InputJsonValue;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
};

const writeAuditLog = (input: TAuditInput) => prisma.auditLog.create({ data: input });
export const AuditService = { writeAuditLog };
