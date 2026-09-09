export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGER: 'MANAGER',
  CONSULTANT: 'CONSULTANT',
  CLIENT: 'CLIENT',
} as const;

export type TUserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const userSearchableFields: string[] = [
  'name',
  'preferredName',
  'email',
  'phone',
  'whatsapp',
  'clientId',
];

export const userFilterableFields: string[] = [
  'searchTerm',
  'roleId',
  'roleName',
  'status',
  'email',
  'country',
  'isDeleted',
];
