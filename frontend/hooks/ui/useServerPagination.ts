import { useState, useCallback, useMemo } from 'react';
import { useApiQuery, UseApiQueryOptions } from '../api/useApiQuery';

export interface ServerPaginationParams {
  pageSize?: number;
  cursor?: string | null;
  offset?: number;
}

export interface UseServerPaginationOptions<T> extends UseApiQueryOptions<T> {
  pageSize?: number;
  pagingStrategy?: 'cursor' | 'offset';
}

export interface UseServerPaginationResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  cursor: string | null;
  offset: number;
  
  // Methods
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for server-side pagination with API integration
 * Supports both cursor-based and offset-based pagination
 * @param baseUrl - Base API endpoint (e.g., '/api/suppliers')
 * @param token - Authentication token
 * @param options - Configuration options
 * @returns Object with paginated data and navigation methods
 * 
 * @example
 * ```tsx
 * const {
 *   data: items,
 *   loading,
 *   currentPage,
 *   pageSize,
 *   hasNextPage,
 *   nextPage,
 *   previousPage,
 * } = useServerPagination<Supplier[]>(
 *   '/api/suppliers',
 *   token,
 *   {
 *     pageSize: 10,
 *     pagingStrategy: 'cursor',
 *   }
 * );
 * 
 * return (
 *   <>
 *     {items?.map((item) => (
 *       <div key={item.id}>{item.name}</div>
 *     ))}
 *     <button onClick={previousPage}>Previous</button>
 *     <span>Page {currentPage}</span>
 *     <button onClick={nextPage} disabled={!hasNextPage}>
 *       Next
 *     </button>
 *   </>
 * );
 * ```
 */
export function useServerPagination<T = any>(
  baseUrl: string,
  token?: string,
  options: UseServerPaginationOptions<T> = {}
): UseServerPaginationResult<T> {
  const {
    pageSize: initialPageSize = 10,
    pagingStrategy = 'cursor',
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [cursor, setCursor] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasNextPageState, setHasNextPageState] = useState(true);

  // Build URL with pagination parameters
  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set('pageSize', pageSize.toString());

    if (pagingStrategy === 'cursor' && cursor) {
      params.set('cursor', cursor);
    } else if (pagingStrategy === 'offset') {
      params.set('offset', offset.toString());
    }

    return `${baseUrl}?${params.toString()}`;
  }, [baseUrl, pageSize, cursor, offset, pagingStrategy]);

  // Fetch paginated data
  const { data, loading, error, refetch } = useApiQuery<T>(
    url,
    token,
    {
      enabled,
      onSuccess: (data) => {
        // Extract hasNextCursor/hasNext from response
        if (data && typeof data === 'object') {
          const hasNext = ('hasNextCursor' in data || 'hasNext' in data)
            ? (data as any).hasNextCursor ?? (data as any).hasNext ?? false
            : true;
          setHasNextPageState(hasNext);
        }
        onSuccess?.(data);
      },
      onError,
    }
  );

  const nextPage = useCallback(() => {
    if (hasNextPageState) {
      if (pagingStrategy === 'cursor') {
        // Extract next cursor from response
        if (data && typeof data === 'object' && 'nextCursor' in data) {
          setCursor((data as any).nextCursor);
        }
      } else {
        setOffset(prev => prev + pageSize);
      }
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPageState, pageSize, pagingStrategy, data]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      if (pagingStrategy === 'cursor') {
        // Reset cursor for previous page (requires server support)
        setCursor(null);
      } else {
        setOffset(prev => Math.max(0, prev - pageSize));
      }
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage, pageSize, pagingStrategy]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1) {
      setCurrentPage(page);
      if (pagingStrategy === 'offset') {
        setOffset((page - 1) * pageSize);
      } else {
        // Cursor-based pagination doesn't support direct page jumping
        console.warn('Direct page navigation not supported with cursor-based pagination');
      }
    }
  }, [pageSize, pagingStrategy]);

  const setPageSize = useCallback((size: number) => {
    if (size > 0 && size <= 1000) {
      setPageSizeState(size);
      setCurrentPage(1);
      setOffset(0);
      setCursor(null);
    }
  }, []);

  return {
    data,
    loading,
    error,
    currentPage,
    pageSize,
    hasNextPage: hasNextPageState,
    hasPreviousPage: currentPage > 1,
    cursor,
    offset,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    refetch,
  };
}
