import { UserStatus } from '@prisma/client';

export type TUserFilterRequest = {
  searchTerm?: string;
  roleId?: string;
  roleName?: string;
  status?: UserStatus;
  email?: string;
  phone?: string;
  country?: string;
  isDeleted?: boolean;
};

export type TCreateUserPayload = {
  name: string;
  preferredName?: string;
  email: string;
  password: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  preferredLanguage?: string;
  communicationConsent?: boolean;
  roleId?: string;
  roleName?: string;
  status?: UserStatus;
  clientId?: string;
};

export type TUpdateUserPayload = Partial<Omit<TCreateUserPayload, 'email'>>;
