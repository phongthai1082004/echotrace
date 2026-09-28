"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";

type ListResp<T> = { items: T[]; nextCursor: number | null };

export function useCursorList<T>(endpoint: string, filters: Record<string, string>) {
  const token = (useSession().data as { accessToken?: string } | undefined)?.accessToken;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [stack, setStack] = useState<number[]>([]);
  const [nonce, setNonce] = useState(0);
  const filterKey = JSON.stringify(filters);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    if (cursor) p.set("cursor", String(cursor));
    return `${endpoint}?${p.toString()}`;
  }, [endpoint, filterKey, cursor]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const ctrl = new AbortController();
    apiFetch<ListResp<T>>(query, token, { signal: ctrl.signal })
      .then((d) => {
        setItems(d?.items || []);
        setNextCursor(d?.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [token, query, nonce]);

  useEffect(() => {
    setCursor(null);
    setStack([]);
  }, [filterKey]);

  const next = () => {
    if (!nextCursor) return;
    setStack((s) => (cursor ? [...s, cursor] : s));
    setCursor(nextCursor);
  };
  const prev = () => {
    const s = [...stack];
    const p = s.pop() ?? null;
    setCursor(p);
    setStack(s);
  };

  return { items, loading, nextCursor, hasPrevious: stack.length > 0, next, prev, reload: () => setNonce((n) => n + 1) };
}
