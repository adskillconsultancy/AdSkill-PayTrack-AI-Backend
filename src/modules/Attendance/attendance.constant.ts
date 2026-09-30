export const attendanceSearchableFields = [
  "user.name",
  "user.email",
  "currentFocus",
  "eodNotes",
];

export const attendanceFilterableFields = [
  "searchTerm",
  "startDate",
  "endDate",
  "userId",
  "roleId",
  "status",
  "workDate",
];

export const DEFAULT_FOCUS_OPTIONS = [
  "Client Consultation",
  "Payment Follow-up",
  "Document Review & Verification",
  "Case Processing & Intake",
  "General Administration",
] as const;
