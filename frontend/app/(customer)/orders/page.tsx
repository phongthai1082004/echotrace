"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { SkeletonCardRow } from "@/components/skeleton";
import { useVisibleCards } from "@/lib/use-container-query";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import type { OrderDTO } from "@/lib/order.dto";
import { OrderCard } from "./_components/order-card";
import { OrderDetailDrawer } from "@/components/order-detail-drawer";

export default function OrdersPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const token = (useSession().data as { accessToken?: string } | undefined)?.accessToken;
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);
  const { ref: skeletonRef, visibleCount } = useVisibleCards<HTMLDivElement>(300, 20);
  void skeletonRef;
  void visibleCount;

  useEffect(() => {
    if (!token) return;
    apiFetch<OrderDTO[]>("/api/orders", token)
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [token]);

  // Poll verify khi đơn đang chờ thanh toán (webhook localhost không tới được → hỏi PayOS trực tiếp)
  const selId = selectedOrder?.id;
  const selStatus = selectedOrder?.status;
  useEffect(() => {
    if (!token || !selId || selStatus !== "pending_payment") return;
    const id = setInterval(async () => {
      try {
        const r = await apiFetch<{ status: string }>(`/api/orders/${selId}/verify`, token, { method: "POST" });
        if (r?.status && r.status !== "pending_payment") {
          clearInterval(id);
          showToast(t("customer.orders.paymentSuccess"), "success");
          setOrders((prev) => (prev ? prev.map((o) => (o.id === selId ? { ...o, status: r.status as OrderDTO["status"], qrCode: undefined } : o)) : prev));
          setSelectedOrder((prev) => (prev ? { ...prev, status: r.status as OrderDTO["status"] } : prev));
        }
      } catch {}
    }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, selStatus, token]);

  const requestPaymentLink = (id: number) =>
    apiFetch<{ qrCode?: string; checkoutUrl?: string }>(`/api/orders/${id}/payment-link`, token!, {
      method: "POST",
    });

  const cancelOrder = async (id: number) => {
    try {
      const r = await apiFetch<{ refunded: boolean; amount: number }>(`/api/orders/${id}/cancel`, token!, {
        method: "POST",
      });
      const status = r?.refunded ? "refunded" : "cancelled";
      showToast(r?.refunded ? t("customer.orders.cancelledRefunded") : t("customer.orders.cancelled"), "success");
      setOrders((prev) => (prev ? prev.map((o) => (o.id === id ? { ...o, status: status as OrderDTO["status"] } : o)) : prev));
      setSelectedOrder((prev) => (prev ? { ...prev, status: status as OrderDTO["status"] } : prev));
      return r;
    } catch (e: any) {
      showToast(e?.message || t("customer.orders.cancelledRefunded"), "error");
      return { refunded: false, amount: 0 };
    }
  };

  const requestReturn = async (id: number, body: { reason?: string; items?: { index: number; quantity: number; defect?: string }[] }) => {
    await apiFetch(`/api/orders/${id}/return`, token!, { method: "POST", body: JSON.stringify(body) });
    showToast(t("customer.orders.return.requested"), "success");
    setOrders((prev) => (prev ? prev.map((o) => (o.id === id ? { ...o, returnState: "requested" } : o)) : prev));
    setSelectedOrder((prev) => (prev ? { ...prev, returnState: "requested" } : prev));
  };

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
        <h1 className="text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold">
          {t("customer.orders.title")}
        </h1>
        <p className="text-sm mt-1 text-[#666]">{t("customer.orders.subtitle")}</p>
      </div>

      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-5 text-[#666]">
          {t("customer.orders.history")}
        </p>
        <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }}>
          {orders === null ? (
            <SkeletonCardRow count={2} aspect="landscape" />
          ) : orders.length === 0 ? (
            <p className="text-sm font-bold text-[#999] py-10">{t("customer.orders.empty")}</p>
          ) : (
            <div className="flex gap-5" style={{ width: "max-content" }}>
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onOpen={setSelectedOrder} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          variant="user"
          onRequestPaymentLink={requestPaymentLink}
          onCancelOrder={cancelOrder}
          onRequestReturn={requestReturn}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
