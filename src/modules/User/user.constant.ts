export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MANAGER: "MANAGER",
  CONSULTANT: "CONSULTANT",
  CLIENT: "CLIENT",
} as const;

export type TUserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Granular permission keys
export const PERMISSIONS = {
  // User Management
  USER_READ: "user:read",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_MANAGE_ROLE: "user:manage-role",

  // Service Catalog
  SERVICE_READ: "service:read",
  SERVICE_MANAGE: "service:manage",

  // Payment Plans
  PLAN_READ: "plan:read",
  PLAN_CREATE: "plan:create",
  PLAN_UPDATE: "plan:update",
  PLAN_DELETE: "plan:delete",

  // Payments & Transactions
  PAYMENT_READ: "payment:read",
  PAYMENT_RECORD: "payment:record",
  PAYMENT_VERIFY: "payment:verify",
  PAYMENT_REFUND: "payment:refund",
  PAYMENT_PAY: "payment:pay",

  // Invoices & Receipts
  INVOICE_READ: "invoice:read",
  INVOICE_GENERATE: "invoice:generate",
  RECEIPT_READ: "receipt:read",
  RECEIPT_GENERATE: "receipt:generate",

  // Reports
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",

  // Notes
  NOTE_READ: "note:read",
  NOTE_CREATE: "note:create",
  NOTE_READ_INTERNAL: "note:read-internal",
} as const;

export const userSearchableFields: string[] = [
  "name",
  "preferredName",
  "email",
  "phone",
  "whatsapp",
  "clientId",
];

export const userFilterableFields: string[] = [
  "searchTerm",
  "roleId",
  "roleName",
  "status",
  "email",
  "country",
  "isDeleted",
  "startDate",
  "endDate",
];

export const userSortableFields: string[] = [
  "name",
  "email",
  "status",
  "country",
  "createdAt",
  "updatedAt",
];
