export type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type PaginatedResult<T> = PaginationState & {
  items: T[];
};

export function parsePageParam(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function getPaginationState({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationState {
  const normalizedPageSize = Math.max(1, Math.trunc(pageSize));
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, Math.trunc(page)), totalPages);

  return {
    page: currentPage,
    pageSize: normalizedPageSize,
    total,
    totalPages,
    skip: (currentPage - 1) * normalizedPageSize,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

export function createPaginatedResult<T>(items: T[], state: PaginationState): PaginatedResult<T> {
  return {
    items,
    ...state,
  };
}
