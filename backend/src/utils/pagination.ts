export interface PaginationParams {
  cursor?: string;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const parsePaginationParams = (query: {
  cursor?: string;
  limit?: string;
}): PaginationParams => {
  return {
    cursor: query.cursor || undefined,
    limit: Math.min(parseInt(query.limit || '50', 10), 100),
  };
};
