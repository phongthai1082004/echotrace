import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import { useTranslation } from "react-i18next";

export interface UseApiMutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

export interface UseApiMutationResult<T> {
  mutate: (data?: any) => Promise<T | null>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for API mutations (POST, PATCH, DELETE)
 * Automatically shows toast notifications on success/failure
 * @param url - API endpoint path (e.g., '/api/suppliers')
 * @param method - HTTP method (POST, PATCH, DELETE)
 * @param token - Authentication token
 * @param options - Configuration options
 * @returns Object with mutate function, loading, error states
 *
 * @example
 * ```tsx
 * const { mutate, loading, error } = useApiMutation(
 *   '/api/suppliers',
 *   'POST',
 *   token,
 *   {
 *     onSuccess: (data) => console.log('Created:', data),
 *     successMessage: 'Supplier created successfully',
 *   }
 * );
 *
 * const handleCreate = async () => {
 *   const result = await mutate({ name: 'New Supplier' });
 * };
 * ```
 */
export function useApiMutation<T = any>(
  url: string,
  method: "POST" | "PATCH" | "DELETE" = "POST",
  token?: string,
  options: UseApiMutationOptions<T> = {},
): UseApiMutationResult<T> {
  const { onSuccess, onError, successMessage, errorMessage, showToast: shouldShowToast = true } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showToast } = useToast();
  const { t } = useTranslation();

  const mutate = useCallback(
    async (body?: any): Promise<T | null> => {
      if (!token) {
        const err = new Error("No authentication token provided");
        setError(err);
        if (shouldShowToast) {
          showToast(errorMessage || t("common.authError") || "Authentication required", "error");
        }
        onError?.(err);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch<T>(url, token, {
          method,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (shouldShowToast) {
          showToast(successMessage || t("common.success") || "Operation successful", "success");
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        if (shouldShowToast) {
          showToast(errorMessage || error.message || t("common.error") || "Operation failed", "error");
        }

        onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url, method, token, shouldShowToast, successMessage, errorMessage, showToast, t, onSuccess, onError],
  );

  return {
    mutate,
    loading,
    error,
  };
}
