import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import type { OrderDTO } from "@/lib/order.dto";

export function useCustomerOrders(initial?: OrderDTO[] | null) {
  const { showToast } = useToast();
  const token = (useSession().data as { accessToken?: string } | undefined)?.accessToken;
  // ponytail: có initial từ server thì khỏi fetch lại — hết waterfall + flash skeleton.
  const [orders, setOrders] = useState<OrderDTO[] | null>(initial ?? null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);

  useEffect(() => {
    if (!token || initial !== undefined) return;
    apiFetch<OrderDTO[]>("/api/orders", token)
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [token]);

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
    // ponytail: 12s + skip tab ẩn — webhook là luồng chính, poll chỉ fallback.
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
    selectedOrder,
    setSelectedOrder,
    requestPaymentLink,
    cancelOrder,
    requestReturn,
    reportDefect,
    pollVerify,
  };
}