export const CASE_PERMISSIONS = {
  CREATE: "case:create",
  READ: "case:read",
  MANAGE: "case:manage",
} as const;

export const caseSearchableFields = [
  "caseCode",
  "serviceNameSnapshot",
  "destinationCountry",
];
