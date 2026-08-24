"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SkeletonCardRow } from "@/components/skeleton";
import { useVisibleCards } from "@/lib/use-container-query";
import { mockOrders, type Order } from "./_lib/mock-orders";
import { OrderCard } from "./_components/order-card";
import { OrderDetail } from "./_components/order-detail";

export default function OrdersPage() {
  const { t } = useTranslation();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { ref: skeletonRef, visibleCount } = useVisibleCards<HTMLDivElement>(300, 20);

  // ponytail: mock data — wire GET /orders khi backend có module orders.
  const loading = false;
  void skeletonRef;
  void visibleCount;

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
          {loading ? (
            <SkeletonCardRow count={2} aspect="landscape" />
          ) : (
            <div className="flex gap-5" style={{ width: "max-content" }}>
              {mockOrders.map((order) => (
                <OrderCard key={order.id} order={order} onOpen={setSelectedOrder} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}
