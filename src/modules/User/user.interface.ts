import { UserRole, UserStatus } from '@prisma/client';

export type TUserFilterRequest = {
  searchTerm?: string;
  role?: UserRole;
  status?: UserStatus;
  email?: string;
  phone?: string;
};

export type TCreateUserPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
};

export type TUpdateUserPayload = Partial<Omit<TCreateUserPayload, 'email'>>;
