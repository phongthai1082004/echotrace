"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { UserStatus } from "@echotrace/shared";
import { UserResponse } from "@/models/users/user.list";
import { apiFetch } from "@/lib/api.fetch";
import { useDebounce } from "@hooks";
import { isAuthenticatedSession } from "@/types/auth";
import { detectSearchTarget } from "@/lib/search-detector";

export function useUsers() {
  const { data: session } = useSession();
  const isAuthenticated = isAuthenticatedSession(session);
  const token = isAuthenticated ? session.accessToken : undefined;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [filter, setFilter] = useState<UserStatus | "all">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [users, setUsers] = useState<UserResponse["users"]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const queryUrl = useMemo(() => {
    if (!isAuthenticated) return "";
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
      params.set("field", detectSearchTarget(debouncedSearch));
    }
    if (cursor) params.set("cursor", cursor);
    params.set("limit", "20");
    params.set("_r", String(refreshKey));
    return `/api/admin/users?${params.toString()}`;
  }, [isAuthenticated, filter, debouncedSearch, cursor, refreshKey]);

  const updateStatus = async (id: number, status: UserStatus) => {
    if (!token) throw new Error("missing token");
    await apiFetch(`/api/admin/users/${id}/status`, token, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!token || !queryUrl) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap fetch
    setLoading(true);
    apiFetch<UserResponse>(queryUrl, token)
      .then((d) => {
        setUsers(d?.users ?? []);
        setNextCursor(d?.nextCursor || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, queryUrl]);

  // Reset pagination whenever search/filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset phÃ¢n trang khi filter Ä‘á»•i
    setCursor(null);
    setCursorStack([]);
  }, [debouncedSearch, filter]);

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
    filter,
    setFilter,
    users,
    loading,
    nextCursor,
    cursorStack,
    handleNext,
    handlePrevious,
    isAuthenticated,
    accessToken: token,
    updateStatus,
    refresh,
  };
}
