import { z } from "zod";
import { UserStatus } from "@prisma/client";

const createUserValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Name is required",
    }),
    preferredName: z.string().optional(),
    email: z
      .string({
        required_error: "Email is required",
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
    roleId: z.string().uuid("Invalid role ID format").optional(),
    roleName: z.string().optional(),
    status: z.nativeEnum(UserStatus).optional(),
    clientId: z.string().optional(),
    permissionIds: z.array(z.string().uuid("Invalid permission ID format")).optional(),
    deniedPermissionIds: z.array(z.string().uuid("Invalid permission ID format")).optional(),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    preferredName: z.string().optional(),
    password: z.string().min(6).optional(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    roleId: z.string().uuid("Invalid role ID format").optional(),
    roleName: z.string().optional(),
    status: z.nativeEnum(UserStatus).optional(),
    clientId: z.string().optional(),
    isDeleted: z.boolean().optional(),
  }),
});

const updateUserPermissionsValidationSchema = z.object({
  body: z.object({
    permissionIds: z.array(z.string().uuid("Invalid permission ID format")).optional(),
    deniedPermissionIds: z.array(z.string().uuid("Invalid permission ID format")).optional(),
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
  updateUserPermissionsValidationSchema,
};

