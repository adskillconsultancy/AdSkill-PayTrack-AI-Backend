import { z } from "zod";

const registerValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Full legal name is required",
    }),
    preferredName: z.string().optional(),
    email: z
      .string({
        required_error: "Email address is required",
      })
      .email("Invalid email address format"),
    password: z
      .string({
        required_error: "Password is required",
      })
      .min(6, "Password must be at least 6 characters long"),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: "Email address is required",
      })
      .email("Invalid email address format"),
    password: z.string({
      required_error: "Password is required",
    }),
    mfaCode: z.string().optional(),
  }),
});

const refreshTokenValidationSchema = z.object({
  cookies: z
    .object({
      refreshToken: z.string({
        required_error: "Refresh token is required in cookies",
      }),
    })
    .optional(),
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

const updateProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    preferredName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    whatsapp: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    currentPassword: z.string({
      required_error: "Current password is required",
    }).min(1, "Current password is required"),
    newPassword: z.string({
      required_error: "New password is required",
    }).min(6, "New password must be at least 6 characters"),
  }),
});

const forgotPasswordValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: "Email address is required",
      })
      .email("Invalid email address format"),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    token: z.string({
      required_error: "Reset token is required",
    }),
    newPassword: z
      .string({
        required_error: "New password is required",
      })
      .min(6, "New password must be at least 6 characters long"),
  }),
});

const verifyMfaLoginValidationSchema = z.object({
  body: z.object({
    mfaToken: z.string({
      required_error: "MFA session token is required",
    }),
    code: z
      .string({
        required_error: "MFA 6-digit verification code is required",
      })
      .length(6, "MFA code must be exactly 6 digits"),
  }),
});

const enableMfaValidationSchema = z.object({
  body: z.object({
    secret: z.string({
      required_error: "MFA secret is required",
    }),
    code: z
      .string({
        required_error: "MFA 6-digit code is required",
      })
      .length(6, "MFA code must be exactly 6 digits"),
  }),
});

const disableMfaValidationSchema = z.object({
  body: z.object({
    password: z.string({
      required_error: "Current password is required to disable MFA",
    }),
  }),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
  updateProfileValidationSchema,
  changePasswordValidationSchema,
  forgotPasswordValidationSchema,
  resetPasswordValidationSchema,
  verifyMfaLoginValidationSchema,
  enableMfaValidationSchema,
  disableMfaValidationSchema,
};
