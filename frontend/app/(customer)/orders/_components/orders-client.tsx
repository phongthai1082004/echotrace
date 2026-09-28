"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SkeletonGrid } from "@/components/skeleton";
import { OrderCard } from "./order-card";
import { OrderDetailDrawer } from "@/components/order-detail-drawer";
import { useCustomerOrders } from "../_hooks/use-customer-orders";
import type { OrdersPage } from "../_hooks/use-customer-orders";

export function OrdersClient({ initialOrders }: { initialOrders?: OrdersPage | null }) {
  const { t } = useTranslation();
  const {
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
  } = useCustomerOrders(initialOrders);

  useEffect(() => {
    if (!selectedOrder?.id) return;
    const cleanup = pollVerify(selectedOrder.id, selectedOrder.status);
    return cleanup;
  }, [selectedOrder?.id, selectedOrder?.status, pollVerify]);

  return (
    <>
      <div className="pb-8">
        {orders === null ? (
          <SkeletonGrid count={6} variant="order" />
        ) : orders.length === 0 ? (
          <p className="text-sm font-bold text-[#999] py-10">{t("customer.orders.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onOpen={setSelectedOrder} />
            ))}
          </div>
        )}
      </div>
      {nextCursor != null && orders && orders.length > 0 && (
        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-md border-2 border-[#222] bg-white shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all disabled:opacity-50"
          >
            {t("customer.orders.loadMore")}
          </button>
        </div>
      )}

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
    </>
  );
}
