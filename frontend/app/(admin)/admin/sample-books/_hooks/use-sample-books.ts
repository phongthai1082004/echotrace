"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { SampleBookDTO } from "@echotrace/shared";
import { apiFetch } from "@/lib/api.fetch";
import { useDebounce } from "@hooks";

type ListResponse = { items: SampleBookDTO[]; nextCursor: number | null };

export function useSampleBooks() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 1000);
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<SampleBookDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cursorStack, setCursorStack] = useState<number[]>([]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (cursor) params.set("cursor", String(cursor));
    return `/api/admin/sample-books?${params.toString()}`;
  }, [type, category, status, debouncedSearch, cursor]);

  useEffect(() => {
    if (!accessToken) return;
// eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap fetch / reset pagination
    setLoading(true);
    setFetchError(null);
    apiFetch<ListResponse>(queryUrl, accessToken)
      .then((d) => {
        setItems(d?.items || []);
        setNextCursor(d?.nextCursor ?? null);
      })
      .catch((err) => {
        console.warn("[admin sample-books] fetch failed:", err);
        setFetchError(String(err));
      })
      .finally(() => setLoading(false));
  }, [accessToken, queryUrl]);

  // reset pagination whenever a filter/search changes
  useEffect(() => {
// eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap fetch / reset pagination
    setCursor(null);
    setCursorStack([]);
  }, [type, category, status, debouncedSearch]);

  const handleNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => (cursor ? [...prev, cursor] : prev));
    setCursor(nextCursor);
  };

  const handlePrevious = () => {
    const stack = [...cursorStack];
    const prevCursor = stack.pop() ?? null;
    setCursor(prevCursor);
    setCursorStack(stack);
  };

  return {
    search,
    setSearch,
    type,
    setType,
    category,
    setCategory,
    status,
    setStatus,
    items,
    setItems,
    loading,
    fetchError,
    nextCursor,
    cursorStack,
    handleNext,
    handlePrevious,
    accessToken,
  };
}
