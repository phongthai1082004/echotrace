import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { useApiQuery, UseApiQueryOptions } from '../api/useApiQuery';

export interface UseDebouncedSearchOptions<T> extends UseApiQueryOptions<T> {
  minSearchLength?: number;
  searchDelay?: number;
  searchParam?: string;
}

export interface UseDebouncedSearchResult<T> {
  search: string;
  setSearch: (value: string) => void;
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for search functionality with API integration and debouncing
 * Combines useDebounce and useApiQuery for optimal search UX
 * @param baseUrl - Base API endpoint (e.g., '/api/suppliers')
 * @param token - Authentication token
 * @param options - Configuration options
 * @returns Object with search input state and API query results
 * 
 * @example
 * ```tsx
 * const { 
 *   search, 
 *   setSearch, 
 *   data: results,
 *   loading,
 *   error,
 * } = useDebouncedSearch<Supplier[]>(
 *   '/api/suppliers',
 *   token,
 *   {
 *     minSearchLength: 2,
 *     searchDelay: 300,
 *     searchParam: 'q',
 *   }
 * );
 * 
 * return (
 *   <>
 *     <input
 *       value={search}
 *       onChange={(e) => setSearch(e.target.value)}
 *       placeholder="Search suppliers..."
 *     />
 *     {loading && <p>Searching...</p>}
 *     {results?.map((item) => (
 *       <div key={item.id}>{item.name}</div>
 *     ))}
 *   </>
 * );
 * ```
 */
export function useDebouncedSearch<T = any>(
  baseUrl: string,
  token?: string,
  options: UseDebouncedSearchOptions<T> = {}
): UseDebouncedSearchResult<T> {
  const {
    minSearchLength = 1,
    searchDelay = 500,
    searchParam = 'q',
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, searchDelay);

  // Build URL with search parameter
  const searchUrl = debouncedSearch && debouncedSearch.length >= minSearchLength
    ? `${baseUrl}?${searchParam}=${encodeURIComponent(debouncedSearch)}`
    : null;

  // Fetch data when debounced search changes
  const { data, loading, error, refetch } = useApiQuery<T>(
    (searchUrl || '') as string,
    token,
    {
      enabled: enabled && !!searchUrl,
      onSuccess,
      onError,
    }
  );

  return {
    search,
    setSearch,
    data,
    loading,
    error,
    refetch,
  };
}
