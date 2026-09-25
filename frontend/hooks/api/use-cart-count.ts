"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api.fetch";

// ponytail: 1 query key cho badge giỏ hàng — nav + flyout từng apiFetch riêng,
// hover vài lần là spam /api/cart. staleTime 60s + dedup của react-query lo.
export const cartCountKey = ["cart", "count"] as const;

export function useCartCount(enabled: boolean) {
  return useQuery({
    queryKey: cartCountKey,
    queryFn: async () => {
      const d = await apiFetch<any>("/api/cart", undefined);
      const items: any[] = d?.parsedItems ?? [];
      return items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) as number;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useInvalidateCartCount() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: cartCountKey });
}
