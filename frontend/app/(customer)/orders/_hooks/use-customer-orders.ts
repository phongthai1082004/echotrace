import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import type { OrderDTO } from "@/lib/order.dto";

export interface OrdersPage {
  items: OrderDTO[];
  nextCursor: number | null;
}

export function useCustomerOrders(initial?: OrdersPage | null) {
  const { showToast } = useToast();
  const token = (useSession().data as { accessToken?: string } | undefined)?.accessToken;
  const [orders, setOrders] = useState<OrderDTO[] | null>(initial?.items ?? null);
  const [nextCursor, setNextCursor] = useState<number | null>(initial?.nextCursor ?? null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);

  useEffect(() => {
    if (!token || initial !== undefined) return;
    apiFetch<OrdersPage>("/api/orders?limit=20", token)
      .then((p) => {
        setOrders(p.items ?? []);
        setNextCursor(p.nextCursor ?? null);
      })
      .catch(() => setOrders([]));
  }, [token]);

  const loadMore = useCallback(async () => {
    if (!token || nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const p = await apiFetch<OrdersPage>(`/api/orders?limit=20&cursor=${nextCursor}`, token);
      setOrders((prev) => {
        const seen = new Set((prev ?? []).map((o) => o.id));
        return [...(prev ?? []), ...(p.items ?? []).filter((o) => !seen.has(o.id))];
      });
      setNextCursor(p.nextCursor ?? null);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  }, [token, nextCursor, loadingMore]);

  const updateOrder = useCallback((id: number, patch: Partial<OrderDTO>) => {
    setOrders((prev) => (prev ? prev.map((o) => (o.id === id ? { ...o, ...patch } : o)) : prev));
    setSelectedOrder((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  const requestPaymentLink = useCallback((id: number) => {
    return apiFetch<{ qrCode?: string; checkoutUrl?: string }>(`/api/orders/${id}/payment-link`, token!, {
      method: "POST",
    });
  }, [token]);

  const cancelOrder = useCallback(async (id: number) => {
    try {
      const r = await apiFetch<{ status: string; refunded: boolean; amount: number }>(`/api/orders/${id}/cancel`, token!, {
        method: "POST",
      });
      const status = (r?.status ?? "cancelled") as OrderDTO["status"];
      showToast(
        status === "pending_refund"
          ? "customer.orders.cancelPendingRefund"
          : status === "refunded"
            ? "customer.orders.cancelledRefunded"
            : "customer.orders.cancelled",
        "success",
      );
      updateOrder(id, { status });
      return r;
    } catch (e: any) {
      showToast(e?.message || "customer.orders.cancelledRefunded", "error");
      return { status: "cancelled", refunded: false, amount: 0 };
    }
  }, [token, updateOrder, showToast]);

  const requestReturn = useCallback(async (id: number, body: { reason?: string; items?: { index: number; quantity: number; defect?: string }[] }) => {
    await apiFetch(`/api/orders/${id}/return`, token!, { method: "POST", body: JSON.stringify(body) });
    showToast("customer.orders.return.requested", "success");
    updateOrder(id, { returnState: "requested" });
  }, [token, updateOrder, showToast]);

  const reportDefect = useCallback(async (id: number) => {
    try {
      await apiFetch(`/api/orders/${id}/report-defect`, token!, { method: "POST" });
      showToast("customer.orders.defect.reported", "success");
      updateOrder(id, { defectState: "reported" });
    } catch (e: any) {
      showToast(e?.message || "customer.orders.defect.failed", "error");
    }
  }, [token, updateOrder, showToast]);

  const pollVerify = useCallback((id: number, status: string) => {
    if (!token || !id || status !== "pending_payment") return;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await apiFetch<{ status: string }>(`/api/orders/${id}/verify`, token, { method: "POST" });
        if (r?.status && r.status !== "pending_payment") {
          clearInterval(interval);
          showToast("customer.orders.paymentSuccess", "success");
          updateOrder(id, { status: r.status as OrderDTO["status"], qrCode: undefined });
        }
      } catch {}
    }, 12000);
    return () => clearInterval(interval);
  }, [token, updateOrder, showToast]);

  return {
    orders,
    nextCursor,
    loadingMore,
    loadMore,
    selectedOrder,
    setSelectedOrder,
    requestPaymentLink,
    cancelOrder,
    requestReturn,
    reportDefect,
    pollVerify,
  };
}