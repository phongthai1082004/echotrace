import { useState, useCallback, useMemo } from 'react';

export interface UsePaginationOptions {
  pageSize?: number;
  maxPages?: number;
}

export interface UsePaginationResult {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
  
  // Methods
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  reset: () => void;
}

/**
 * Hook for client-side pagination
 * Manages pagination state and provides navigation methods
 * @param items - Array of items to paginate
 * @param options - Configuration options
 * @returns Pagination state and methods
 * 
 * @example
 * ```tsx
 * const { 
 *   currentPage, 
 *   pageSize, 
 *   totalPages,
 *   startIndex,
 *   endIndex,
 *   nextPage,
 *   previousPage,
 * } = usePagination(allItems, { pageSize: 10 });
 * 
 * const pageItems = allItems.slice(startIndex, endIndex);
 * 
 * return (
 *   <>
 *     {pageItems.map((item) => (
 *       <div key={item.id}>{item.name}</div>
 *     ))}
 *     <button onClick={previousPage} disabled={!hasPreviousPage}>
 *       Previous
 *     </button>
 *     <span>Page {currentPage} of {totalPages}</span>
 *     <button onClick={nextPage} disabled={!hasNextPage}>
 *       Next
 *     </button>
 *   </>
 * );
 * ```
 */
export function usePagination(
  items: any[] = [],
  options: UsePaginationOptions = {}
): UsePaginationResult {
  const { pageSize: initialPageSize = 10, maxPages = 100 } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Clamp current page to valid range
  const validCurrentPage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const hasNextPage = validCurrentPage < totalPages;
  const hasPreviousPage = validCurrentPage > 1;

  const goToPage = useCallback((page: number) => {
    const normalizedPage = Math.max(1, Math.min(page, Math.max(1, totalPages)));
    setCurrentPage(normalizedPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const setPageSize = useCallback((size: number) => {
    if (size > 0 && size <= 1000) {
      setPageSizeState(size);
      setCurrentPage(1); // Reset to first page when page size changes
    }
  }, []);

  const setTotalItems = useCallback((total: number) => {
    // This is a no-op since items are managed externally
    // But we keep it for API consistency
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(1);
    setPageSizeState(initialPageSize);
  }, [initialPageSize]);

  return {
    currentPage: validCurrentPage,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    setTotalItems,
    reset,
  };
}
