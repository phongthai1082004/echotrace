import { useState, useCallback, useMemo } from "react";

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


  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  reset: () => void;
}


export function usePagination(items: any[] = [], options: UsePaginationOptions = {}): UsePaginationResult {
  const { pageSize: initialPageSize = 10, maxPages = 100 } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);


  const validCurrentPage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const hasNextPage = validCurrentPage < totalPages;
  const hasPreviousPage = validCurrentPage > 1;

  const goToPage = useCallback(
    (page: number) => {
      const normalizedPage = Math.max(1, Math.min(page, Math.max(1, totalPages)));
      setCurrentPage(normalizedPage);
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const setPageSize = useCallback((size: number) => {
    if (size > 0 && size <= 1000) {
      setPageSizeState(size);
      setCurrentPage(1);
    }
  }, []);

  const setTotalItems = useCallback((total: number) => {


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
