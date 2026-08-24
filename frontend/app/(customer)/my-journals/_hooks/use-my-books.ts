"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api.fetch";

export interface JournalBook {
  id: number;
  title: string;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  pages: number;
  style: string;
  cover: string;
  createdAt: string;
}

export function useMyBooks(token?: string) {
  const [journals, setJournals] = useState<JournalBook[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<JournalBook | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
// eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap fetch / reset pagination
    setLoading(true);
    setFetchError(null);
    apiFetch<any[]>("/api/user/my-books", token)
      .then((d) => setJournals(d || []))
      .catch((err) => {
        console.warn("[my-journals] fetch failed:", err);
        setFetchError(String(err));
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDelete = async () => {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/books/${deleteTarget.id}`, token, { method: "DELETE" });
      setJournals((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
    } finally {
      setDeleting(false);
    }
  };

  return { journals, fetchError, loading, deleteTarget, setDeleteTarget, deleting, handleDelete };
}
