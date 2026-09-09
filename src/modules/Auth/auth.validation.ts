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

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
};
