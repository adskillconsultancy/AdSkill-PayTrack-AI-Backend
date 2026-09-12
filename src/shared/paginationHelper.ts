export interface IPaginationOptions {
  page?: number | string;
  limit?: number | string;
}

export interface IPaginationCalculation {
  page: number;
  limit: number;
  skip: number;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

/**
 * Calculates pagination parameters with safety limits (DoS protection).
 * - page: minimum 1 (default: 1)
 * - limit: minimum 1, maximum 100 (default: 20)
 * - skip: (page - 1) * limit
 */
export const calculatePagination = (
  options?: IPaginationOptions
): IPaginationCalculation => {
  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options?.limit) || 20));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

/**
 * Constructs standard pagination metadata matching the API response specification.
 */
export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): IPaginationMeta => {
  return {
    page,
    limit,
    total,
    totalPage: Math.ceil(total / limit) || 1,
  };
};
