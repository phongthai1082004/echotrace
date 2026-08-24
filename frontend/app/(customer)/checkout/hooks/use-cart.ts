"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api.fetch";

// Mọi thao tác giỏ + tổng tiền của checkout. Giá từng dòng do server tính;
// tổng chốt chỉ đến từ POST /cart/calculate (gọi khi chuyển bước hoặc đổi coupon).
export function useCart(token?: string, paymentMethod: "full" | "half" = "full") {
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const patchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const recalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref cho giá trị mới nhất bên trong timer callback (tránh stale closure).
  const couponRef = useRef(couponCode);
  const pmRef = useRef(paymentMethod);
  useEffect(() => {
    couponRef.current = couponCode;
    pmRef.current = paymentMethod;
  }, [couponCode, paymentMethod]);

  useEffect(() => {
    if (!token) return;
    // Giá hiển thị = snapshot đã lưu trong cart; tổng chốt chỉ lúc bấm Continue.
    apiFetch<any>("/api/cart", token)
      .then((c) => setItems(c?.parsedItems ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [token]);

  const recalc = useCallback(
    async (code?: string | null) => {
      if (!token) return;
      const q = await apiFetch<any>("/api/cart/calculate", token, {
        method: "POST",
        body: JSON.stringify({ paymentMethod: pmRef.current, couponCode: code ?? couponRef.current }),
      });
      setQuote(q);
      if (q?.items) setItems(q.items);
      return q;
    },
    [token],
  );

  const debounceRecalc = useCallback(() => {
    if (recalcTimer.current) clearTimeout(recalcTimer.current);
    recalcTimer.current = setTimeout(() => recalc().catch(() => {}), 400);
  }, [recalc]);

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
        patchItem(bookId, patch)
          .then(() => {
            if (couponRef.current) debounceRecalc();
          })
          .catch(() => {});
      }, 400);
    },
    [patchItem, debounceRecalc],
  );

  // Optimistic qty + debounce PATCH.
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
      apiFetch(`/api/cart/item/${bookId}`, token, { method: "DELETE" })
        .then(() => {
          if (couponRef.current) debounceRecalc();
        })
        .catch(() => {});
    },
    [token, debounceRecalc],
  );

  // Sửa cover/paper: server re-price rồi merge item mới vào state.
  const saveItemOptions = useCallback(
    async (bookId: number, cover: string, paper: string) => {
      await patchItem(bookId, { cover, paper });
      if (couponRef.current) debounceRecalc();
    },
    [patchItem, debounceRecalc],
  );

  // Không coupon → toán local chính xác; có coupon → dùng quote từ server.
  const hasCompleteOptions = (i: any) => i?.cover && i?.paper && i?.paperSize;
  const localSubtotal = items.reduce((s: number, i: any) => s + (i.price ?? 0) * (i.quantity || 1), 0);
  const hasCoupon = !!couponCode;
  const subtotal = hasCoupon ? (quote?.subtotal ?? localSubtotal) : localSubtotal;
  const discountAmount = hasCoupon ? (quote?.discount ?? 0) : 0;
  const total = hasCoupon ? (quote?.total ?? subtotal - discountAmount) : subtotal;
  const missingAny = items.some((i: any) => !hasCompleteOptions(i) || i.price == null);

  return {
    items,
    loaded,
    quote,
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
