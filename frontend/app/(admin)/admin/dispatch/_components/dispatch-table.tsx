"use client";

import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import type { Order } from "@/lib/mock-dispatch";
import { neoBtn } from "@/lib/styles";
import { AdminList } from "@/components/admin-list";
import { AdminPagination } from "@/components/admin-pagination";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency } from "../_lib/utils";

export function DispatchTable({
  paged,
  page,
  totalPages,
  setPage,
  onOpen,
}: {
  paged: Order[];
  page: number;
  totalPages: number;
  setPage: (fn: (p: number) => number) => void;
  onOpen: (o: Order) => void;
}) {
  const { t } = useTranslation();
  return (
    <AdminList
      columns={[
        { key: "orderId", label: t("admin.dispatch.orderId"), width: "110px" },
        { key: "customer", label: t("admin.dispatch.customer"), width: "1fr" },
        { key: "product", label: t("admin.dispatch.product"), width: "1fr" },
        { key: "amount", label: t("admin.dispatch.amount"), width: "100px" },
        { key: "status", label: t("admin.dispatch.status"), width: "110px", align: "center" },
        { key: "date", label: t("admin.dispatch.date"), width: "130px" },
        { key: "action", label: t("common.action"), width: "80px", align: "center" },
      ]}
      data={paged}
      rowKey={(o) => o.id}
      rowClassName="hover:bg-[#FFF7D6]/60"
      empty={
        <div className="flex items-center justify-center py-10">
          <p className="font-bold text-[#999]">{t("admin.dispatch.noOrders")}</p>
        </div>
      }
      footer={
        <AdminPagination
          hasNext={page < totalPages - 1}
          hasPrevious={page > 0}
          onNext={() => setPage((p) => p + 1)}
          onPrevious={() => setPage((p) => p - 1)}
        />
      }
      renderRow={(order: Order) => (
        <>
          <div className="px-2 font-mono text-[10px] font-bold text-[#3B82F6] whitespace-nowrap">{order.id}</div>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{order.customer}</div>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{order.product}</div>
          <div className="px-2 font-mono text-[10px] font-bold whitespace-nowrap">{formatCurrency(order.amount)}</div>
          <div className="px-2 flex justify-center">
            <StatusBadge status={order.status} />
          </div>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{order.date}</div>
          <div className="px-2 flex justify-center">
            <button onClick={() => onOpen(order)} className={`${neoBtn} p-1.5`}>
              <Eye size={14} />
            </button>
          </div>
        </>
      )}
    />
  );
}
