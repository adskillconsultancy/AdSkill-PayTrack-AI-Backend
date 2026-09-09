import { z } from "zod";

const createRoleZodSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Role name is required",
      })
      .min(2, "Role name must be at least 2 characters")
      .max(50, "Role name cannot exceed 50 characters")
      .transform((val) => val.toUpperCase().trim().replace(/\s+/g, "_")),
    permissionIds: z.array(z.string().uuid("Invalid permission ID")).optional(),
  }),
});

const updateRolePermissionsZodSchema = z.object({
  body: z.object({
    permissionIds: z.array(z.string().uuid("Invalid permission ID"), {
      required_error: "permissionIds array is required",
    }),
  }),
});

export const RoleValidation = {
  createRoleZodSchema,
  updateRolePermissionsZodSchema,
};
