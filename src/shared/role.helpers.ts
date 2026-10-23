/**
 * Pure Capability-Based Access Control (PBAC) Helpers
 * Zero hardcoded roles — evaluated dynamically against granted capabilities.
 */

// Canonical internal capabilities that define internal operations
export const INTERNAL_STAFF_CAPABILITIES = [
  "case:manage",
  "case:create",
  "note:read-internal",
  "note:update",
  "note:delete",
  "note:manage",
  "attendance:track",
  "attendance:read-self",
  "attendance:read-all",
  "payment:verify",
  "payment:record",
  "payment:refund",
  "report:view",
  "report:export",
  "service:create",
  "service:update",
  "service:delete",
  "service:manage",
  "document:manage",
  "document:update",
  "user:manage-role",
  "user:create",
  "user:delete",
  "audit:read",
] as const;

/**
 * Checks whether an actor possesses internal staff capabilities.
 * - SUPER_ADMIN has full bypass.
 * - Any dynamic role possessing any internal capability evaluates to true.
 * - Non-staff (CLIENT, standard registered USER) evaluate to false.
 */
export const hasStaffCapabilities = (
  permissions: string[] = [],
  roleName?: string | null,
): boolean => {
  if (roleName === "SUPER_ADMIN") return true;
  if (!permissions || permissions.length === 0) return false;
  return permissions.some((perm) =>
    (INTERNAL_STAFF_CAPABILITIES as readonly string[]).includes(perm),
  );
};
