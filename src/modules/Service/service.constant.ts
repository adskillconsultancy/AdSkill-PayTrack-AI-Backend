export const PERMISSIONS = {
  SERVICE_READ: "service:read",
  SERVICE_MANAGE: "service:manage",
} as const;

export const serviceSearchableFields: string[] = [
  "name",
  "code",
  "description",
];

export const serviceFilterableFields: string[] = [
  "searchTerm",
  "category",
  "currency",
  "isActive",
  "isDeleted",
  "startDate",
  "endDate",
];

export const serviceSortableFields: string[] = [
  "name",
  "code",
  "baseFee",
  "createdAt",
  "updatedAt",
];
