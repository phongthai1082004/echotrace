import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api.fetch";

export interface UseApiQueryOptions<T> {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retry?: number;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching data from API
 * @param url - API endpoint path (e.g., '/api/suppliers')
 * @param token - Authentication token
 * @param options - Configuration options
 * @returns Object with data, loading, error states and refetch function
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useApiQuery<Supplier[]>(
 *   '/api/suppliers',
 *   token,
 *   {
 *     enabled: !!token,
 *     onSuccess: (data) => console.log('Loaded:', data),
 *     onError: (error) => console.error('Failed:', error),
 *   }
 * );
 * ```
 */
export function useApiQuery<T = any>(
  url: string,
  token?: string,
  options: UseApiQueryOptions<T> = {},
): UseApiQueryResult<T> {
  const { enabled = true, onSuccess, onError, retry = 0 } = options;

  // Keep callbacks in refs so their identity changes never retrigger fetches
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<T>(url, token);
      setData(result);
      retryCountRef.current = 0;
      onSuccessRef.current?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Retry logic
      if (retryCountRef.current < retry) {
        retryCountRef.current += 1;
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => fetchData(), delay);
        return;
      }

      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setLoading(false);
    }
  }, [url, token, enabled, retry]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    retryCountRef.current = 0;
    await fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
