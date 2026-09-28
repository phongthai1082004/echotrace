"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const LIMIT = 12;

// pass it back on the next call to get items with id < cursor (stable across catalog updates).
export function useExplore(token?: string) {
	const { data: session } = useSession();
	const accessToken = token ?? (session as any)?.accessToken;
	const [samples, setSamples] = useState<ExploreSample[]>([]);
	const [samplesNext, setSamplesNext] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [category, setCategoryState] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const loadSamples = useCallback(
		async (cursor: number, cat: string | null, replace: boolean) => {
			if (!accessToken) return;
			abortRef.current?.abort();
			const ctrl = new AbortController();
			abortRef.current = ctrl;
			const url = `/api/explore/samples?cursor=${cursor}&limit=${LIMIT}${cat ? `&category=${encodeURIComponent(cat)}` : ""}`;
			try {
				const d = await apiFetch<{ items: ExploreSample[]; nextCursor: number | null }>(url, accessToken, {
					signal: ctrl.signal,
				});
				setSamples((prev) => (replace ? d.items : [...prev, ...d.items]));
				setSamplesNext(d.nextCursor);
			} catch {}
		},
		[accessToken],
	);

	useEffect(() => {
		if (!accessToken) return;
		setLoading(true);
		loadSamples(0, null, true).finally(() => setLoading(false));
	}, [accessToken, loadSamples]);

	const setCategory = useCallback(
		(cat: string | null) => {
			setCategoryState(cat);
			setSamples([]);
			setSamplesNext(null);
			loadSamples(0, cat, true);
		},
		[loadSamples],
	);

	const loadMoreSamples = useCallback(() => {
		if (samplesNext != null) loadSamples(samplesNext, category, false);
	}, [samplesNext, category, loadSamples]);

	return { samples, samplesNext, loading, setCategory, loadMoreSamples };
}
