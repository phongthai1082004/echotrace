"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";

export interface ExploreSample {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  style: string;
  pageCount: number;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  paperWidth: number | null;
  paperHeight: number | null;
  theme: { name: string; code: string } | null;
}

export function useExplore(token?: string) {
  const { data: session } = useSession();
  const accessToken = token ?? (session as any)?.accessToken;
  const [samples, setSamples] = useState<ExploreSample[]>([]);
  const [albums, setAlbums] = useState<ExploreSample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
// eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap fetch / reset pagination
    setLoading(true);
    Promise.all([
      apiFetch<any[]>("/api/explore/samples", accessToken)
        .then((d) => setSamples(d || []))
        .catch(() => {}),
      apiFetch<any[]>("/api/explore/albums", accessToken)
        .then((d) => setAlbums(d || []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [accessToken]);

  return { samples, albums, loading };
}
