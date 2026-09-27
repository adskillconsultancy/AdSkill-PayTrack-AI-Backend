export type TRegisterPayload = {
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
};

export type TLoginPayload = {
  email: string;
  password: string;
  mfaCode?: string;
};

export type TAuthUserResponse = {
  id: string;
  clientId: string | null;
  name: string;
  preferredName: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  status: string;
  isMfaEnabled: boolean;
  roleId: string;
  role: {
    id: string;
    name: string;
  };
  permissions?: string[];
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TAuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: TAuthUserResponse;
  mfaRequired?: boolean;
  mfaToken?: string;
};

export type TRefreshTokenResponse = {
  accessToken: string;
};

export type TUpdateProfilePayload = {
  name?: string;
  preferredName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type TChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type TForgotPasswordPayload = {
  email: string;
};

export type TResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export type TVerifyMfaLoginPayload = {
  mfaToken: string;
  code: string;
};

export type TEnableMfaPayload = {
  secret: string;
  code: string;
};

export type TDisableMfaPayload = {
  password: string;
};
