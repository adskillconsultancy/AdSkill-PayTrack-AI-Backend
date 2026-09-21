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

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
  updateProfileValidationSchema,
  changePasswordValidationSchema,
};
