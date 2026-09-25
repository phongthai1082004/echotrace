"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SkeletonGrid } from "@/components/skeleton";
import { OrderCard } from "./order-card";
import { OrderDetailDrawer } from "@/components/order-detail-drawer";
import { useCustomerOrders } from "../_hooks/use-customer-orders";
import type { OrderDTO } from "@/lib/order.dto";

// ponytail: island tương tác — list lần đầu từ server (initialOrders), hết waterfall + flash skeleton.
export function OrdersClient({ initialOrders }: { initialOrders?: OrderDTO[] | null }) {
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
