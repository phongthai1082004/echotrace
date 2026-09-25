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
  i18n?: { title?: Record<string, unknown>; message?: Record<string, unknown> } | null;
}

const LIMIT = 10; // ponytail: trang load ít, scroll gần đáy append tiếp

// ponytail: dedup + throttle — 2 mount cùng gọi + hover chuông liên tục = spam /notifications.
let inFlight: Promise<void> | null = null;
let lastOk = 0;

// ponytail: admin broadcast đa ngữ — text theo lang nằm ở cột i18n,
// tin cũ (trước migration) rớt về metadata.i18n, thiếu nữa thì về title/message gốc.
export function notifText(n: NotifItem, field: "title" | "message", lang?: string | null): string {
  const l = (lang || "vi").slice(0, 2).toLowerCase();
  const hit =
    n.i18n?.[field]?.[l] ??
    (n.metadata as { i18n?: Record<string, Record<string, unknown>> } | undefined)?.i18n?.[field]?.[l];
  if (typeof hit === "string" && hit.trim()) return hit;
  return String(n[field] ?? "");
}

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
  setUnread: (id: number | string) => void;
  reset: () => void;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  items: [],
  hasMore: true,
  loadingMore: false,

  refresh: () => {
    if (inFlight) return inFlight;
    if (Date.now() - lastOk < 30_000) return Promise.resolve();
    inFlight = (async () => {
      try {
        const items = await apiFetch<NotifItem[]>(`/api/notifications?limit=${LIMIT}`, undefined);
        const list = Array.isArray(items) ? items : [];
        lastOk = Date.now();
        useNotifStore.setState({ items: list, hasMore: list.length >= LIMIT });
      } catch {}
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
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

  setUnread: (id) =>
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, isRead: false } : x)) })),

  reset: () => {
    // ponytail: reset cả throttle để test/đăng xuất không kẹt cửa sổ 30s.
    inFlight = null;
    lastOk = 0;
    set({ items: [], hasMore: true, loadingMore: false });
  },
}));

export const useUnreadCount = () => useNotifStore((s) => s.items.filter((n) => !n.isRead).length);
