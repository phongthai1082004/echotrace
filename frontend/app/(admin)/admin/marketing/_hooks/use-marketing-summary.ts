"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";

export interface MarketingSourceRow {
  source: string;
  visitors: number;
  opened: number;
  preview: number;
  checkout: number;
  orders: number;
  revenue: number;
  books: number;
}

export interface MarketingSummary {
  from: string;
  to: string;
  gaConfigured: boolean;
  totals: {
    orders: number;
    revenue: number;
    avgOrderValue: number;
    books: number;
    visitors: number;
    opened: number;
    preview: number;
    checkout: number;
  };
  bySource: MarketingSourceRow[];
}

export function useMarketingSummary(days = 30) {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  const [data, setData] = useState<MarketingSummary | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<MarketingSummary>(`/api/admin/marketing/summary?days=${days}`, accessToken)
      .then((d) => setData(d ?? null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return data;
}
