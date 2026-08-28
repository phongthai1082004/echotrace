"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SkeletonCardRow } from "@/components/skeleton";
import { OrderCard } from "./_components/order-card";
import { OrderDetailDrawer } from "@/components/order-detail-drawer";
import { useCustomerOrders } from "./_hooks/use-customer-orders";

export default function OrdersPage() {
  const { t } = useTranslation();
  const {
    orders,
    selectedOrder,
    setSelectedOrder,
    requestPaymentLink,
    cancelOrder,
    requestReturn,
    reportDefect,
    pollVerify,
  } = useCustomerOrders();

  useEffect(() => {
    if (!selectedOrder?.id) return;
    const cleanup = pollVerify(selectedOrder.id, selectedOrder.status);
    return cleanup;
  }, [selectedOrder?.id, selectedOrder?.status, pollVerify]);

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
          onReportDefect={reportDefect}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}