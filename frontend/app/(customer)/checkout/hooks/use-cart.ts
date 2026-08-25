"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api.fetch";
import { computeCouponDiscount } from "@echotrace/shared";
import { useToast } from "@/components/toast";

// Mọi thao tác giỏ + tổng tiền của checkout.
// Giá từng dòng do server trả (GET /cart, PATCH re-price).
// Tổng tiền tính LOCAL mỗi render: subtotal = Σ price×qty (item được tick),
// discount = computeCouponDiscount(couponInfo từ quote) → tick/đổi qty không tốn API.
// POST /cart/calculate chỉ gọi khi chuyển bước (chốt) hoặc áp/gỡ coupon (lấy couponInfo mới).
export function useCart(token?: string, paymentMethod: "full" | "half" = "full") {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  // Snapshot coupon từ lần calculate gần nhất — FE tự nhân công discount trên nó.
  const [couponInfo, setCouponInfo] = useState<any>(null);
  const [couponCode, setCouponCodeState] = useState<string | null>(null);
  const patchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const pmRef = useRef(paymentMethod);
  useEffect(() => {
    pmRef.current = paymentMethod;
  }, [paymentMethod]);

  const setCouponCode = useCallback((code: string | null) => {
    setCouponCodeState(code);
    if (!code) setCouponInfo(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<any>("/api/cart", token)
      .then((c) => {
        const list: any[] = c?.parsedItems ?? [];
        setItems(list);
        setSelected(new Set(list.map((i: any) => i.bookId)));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [token]);

  const toggleItem = useCallback((bookId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => (prev.size === items.length && items.length > 0 ? new Set() : new Set(items.map((i: any) => i.bookId))));
  }, [items]);

  const { showToast } = useToast();

  // Chốt tổng authoritative: server re-price + validate coupon, trả kèm couponInfo
  // để các lần tick sau tiếp tục tính local. Chỉ gọi ở Continue và DiscountModal.
  // Lỗi (vd MISSING_BOOK_OPTIONS) → toast + trả null, caller phải kiểm tra trước khi chuyển bước.
  const recalc = useCallback(
    async (code?: string | null) => {
      if (!token) return null;
      try {
        const q = await apiFetch<any>("/api/cart/calculate", token, {
          method: "POST",
          body: JSON.stringify({
            paymentMethod: pmRef.current,
            couponCode: code ?? couponCode,
            bookIds: [...selected],
          }),
        });
        if (q?.coupon) setCouponInfo(q.coupon);
        if (q?.items) {
          const priced = new Map(q.items.map((i: any) => [i.bookId, i]));
          setItems((prev) => prev.map((it: any) => priced.get(it.bookId) ?? it));
        }
        return q;
      } catch (e: any) {
        showToast(e?.message || "Calculate failed", "error");
        return null;
      }
    },
    [token, couponCode, selected, showToast],
  );

  const patchItem = useCallback(
    async (bookId: number, patch: Record<string, unknown>) => {
      if (!token) return null;
      const r = await apiFetch<any>(`/api/cart/item/${bookId}`, token, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (r?.item) setItems((prev) => prev.map((it: any) => (it.bookId === bookId ? { ...it, ...r.item } : it)));
      return r;
    },
    [token],
  );

  const debouncePatch = useCallback(
    (bookId: number, patch: Record<string, unknown>) => {
      clearTimeout(patchTimers.current[bookId]);
      patchTimers.current[bookId] = setTimeout(() => {
        patchItem(bookId, patch).catch(() => {});
      }, 400);
    },
    [patchItem],
  );

  // Optimistic qty + debounce PATCH (persist). Giá dòng không đổi theo qty → không cần recalc.
  const changeQty = useCallback(
    (bookId: number, quantity: number) => {
      setItems((prev) => prev.map((it: any) => (it.bookId === bookId ? { ...it, quantity } : it)));
      debouncePatch(bookId, { quantity });
    },
    [debouncePatch],
  );

  const deleteItem = useCallback(
    (bookId: number) => {
      setItems((prev) => prev.filter((it: any) => it.bookId !== bookId));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
      apiFetch(`/api/cart/item/${bookId}`, token, { method: "DELETE" }).catch(() => {});
    },
    [token],
  );

  // Sửa cover/paper: server re-price rồi merge item mới vào state (giá dòng đổi → cần server).
  const saveItemOptions = useCallback(
    async (bookId: number, cover: string, paper: string) => {
      await patchItem(bookId, { cover, paper });
    },
    [patchItem],
  );

  // Tổng tiền: pure derivation mỗi render — tick/qty/xóa phản ánh tức thì, 0 API.
  const selectedItems = items.filter((i: any) => selected.has(i.bookId));
  const hasCompleteOptions = (i: any) => i?.cover && i?.paper && i?.paperSize;
  const subtotal = selectedItems.reduce((s: number, i: any) => s + (i.price ?? 0) * (i.quantity || 1), 0);
  const discountAmount = couponInfo ? computeCouponDiscount(couponInfo, subtotal, selectedItems) : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const missingAny =
    selectedItems.length === 0 || selectedItems.some((i: any) => !hasCompleteOptions(i) || i.price == null);

  return {
    items,
    selectedItems,
    selected,
    selectedCount: selected.size,
    toggleItem,
    toggleAll,
    loaded,
    couponInfo,
    couponCode,
    setCouponCode,
    recalc,
    changeQty,
    deleteItem,
    saveItemOptions,
    subtotal,
    discountAmount,
    total,
    missingAny,
  };
}
