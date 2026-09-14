"use client";

import { create } from "zustand";
import { apiFetch } from "@/lib/api.fetch";

export interface NotifItem {
  id: number | string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt?: string;
  metadata?: any;
}

const LIMIT = 20;

interface NotifState {
  items: NotifItem[];
  hasMore: boolean;
  loadingMore: boolean;
  // replace toàn list (load đầu + poll backup) — tự hết trùng với tin live
  refresh: () => Promise<void>;
  // cursor append (scroll) — dedup theo id số
  loadMore: () => Promise<void>;
  // prepend tin live từ SSE (id tạm `live-*`)
  pushLive: (n: NotifItem) => void;
  setRead: (id: number | string) => void;
  reset: () => void;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  items: [],
  hasMore: true,
  loadingMore: false,

  refresh: async () => {
    try {
      const items = await apiFetch<NotifItem[]>(`/api/notifications?limit=${LIMIT}`, undefined);
      const list = Array.isArray(items) ? items : [];
      set({ items: list, hasMore: list.length >= LIMIT });
    } catch {}
  },

  loadMore: async () => {
    const { items, loadingMore, hasMore } = get();
    if (loadingMore || !hasMore) return;
    const nums = items.filter((i) => typeof i.id === "number");
    if (nums.length === 0) return get().refresh();
    set({ loadingMore: true });
    try {
      const batch = await apiFetch<NotifItem[]>(
        `/api/notifications?limit=${LIMIT}&cursor=${nums[nums.length - 1].id}`,
        undefined,
      );
      const list = Array.isArray(batch) ? batch : [];
      const seen = new Set(items.map((i) => i.id));
      set({
        items: [...items, ...list.filter((b) => !seen.has(b.id))],
        hasMore: list.length >= LIMIT,
      });
    } catch {
    } finally {
      set({ loadingMore: false });
    }
  },

  pushLive: (n) =>
    set((s) => {
      if (s.items.some((i) => i.id === n.id)) return s;
      return { items: [n, ...s.items] };
    }),

  setRead: (id) =>
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, isRead: true } : x)) })),

  reset: () => set({ items: [], hasMore: true, loadingMore: false }),
}));

export const useUnreadCount = () => useNotifStore((s) => s.items.filter((n) => !n.isRead).length);
