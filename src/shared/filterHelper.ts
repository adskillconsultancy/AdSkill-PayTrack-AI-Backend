export interface ISortOptions {
  sortBy?: string;
  sortOrder?: "asc" | "desc" | string;
}

/**
 * Builds a case-insensitive multi-field search filter for Prisma.
 * Example: Searching "john" in ["name", "email"] creates:
 * { OR: [{ name: { contains: "john", mode: "insensitive" } }, ...] }
 */
export const buildSearchFilter = (
  searchTerm?: string,
  searchableFields: string[] = []
): { OR: Record<string, { contains: string; mode: "insensitive" }>[] } | undefined => {
  if (!searchTerm || !searchTerm.trim() || searchableFields.length === 0) {
    return undefined;
  }

  const term = searchTerm.trim();

  return {
    OR: searchableFields.map((field) => ({
      [field]: {
        contains: term,
        mode: "insensitive" as const,
      },
    })),
  };
};

/**
 * Builds a date range filter (gte / lte) for a specific date column.
 * Handles ISO timestamps and YYYY-MM-DD strings.
 */
export const buildDateRangeFilter = (
  fieldNameOrStartDate: string = "createdAt",
  startDateOrEndDate?: string,
  endDateOrFieldName?: string
): Record<string, { gte?: Date; lte?: Date }> | undefined => {
  let fieldName = "createdAt";
  let startDate: string | undefined;
  let endDate: string | undefined;

  // Check if first argument is a date string instead of a field name
  if (
    /^\d{4}-\d{2}-\d{2}/.test(fieldNameOrStartDate) ||
    (endDateOrFieldName && !/^\d{4}/.test(endDateOrFieldName))
  ) {
    startDate = fieldNameOrStartDate;
    endDate = startDateOrEndDate;
    fieldName = endDateOrFieldName || "createdAt";
  } else {
    fieldName = fieldNameOrStartDate || "createdAt";
    startDate = startDateOrEndDate;
    endDate = endDateOrFieldName;
  }

  if (!startDate && !endDate) {
    return undefined;
  }

  const range: { gte?: Date; lte?: Date } = {};

  if (startDate) {
    const start = new Date(
      startDate.length === 10 ? `${startDate}T00:00:00.000Z` : startDate
    );
    if (!isNaN(start.getTime())) {
      range.gte = start;
    }
  }

  if (endDate) {
    const end = new Date(
      endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate
    );
    if (!isNaN(end.getTime())) {
      range.lte = end;
    }
  }

  if (Object.keys(range).length === 0) {
    return undefined;
  }

  return {
    [fieldName]: range,
  };
};

/**
 * Validates and constructs Prisma orderBy sorting criteria safely.
 * Prevents invalid column sorting by checking against an allowed whitelist.
 */
export const buildSortOrder = (
  options?: ISortOptions,
  allowedSortFields: string[] = ["createdAt"],
  defaultSortBy: string = "createdAt",
  defaultOrder: "asc" | "desc" = "desc"
): Record<string, "asc" | "desc"> => {
  const requestedSortBy = options?.sortBy?.trim();
  const sortBy =
    requestedSortBy && allowedSortFields.includes(requestedSortBy)
      ? requestedSortBy
      : defaultSortBy;

  const requestedSortOrder = options?.sortOrder?.toString().toLowerCase();
  const sortOrder: "asc" | "desc" =
    requestedSortOrder === "asc" ? "asc" : defaultOrder;

  return {
    [sortBy]: sortOrder,
  };
};

/**
 * Builds Prisma exact-match conditions for provided filter attributes,
 * excluding any special keys like search terms or date bounds.
 */
export const buildExactFilters = (
  filters: Record<string, unknown>,
  excludeKeys: string[] = []
): Record<string, unknown>[] => {
  const conditions: Record<string, unknown>[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !excludeKeys.includes(key)
    ) {
      conditions.push({
        [key]: value,
      });
    }
  }

  return conditions;
};
