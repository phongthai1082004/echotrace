"use client";

import { useTranslation } from "react-i18next";
import { Eye, UserPlus } from "lucide-react";
import type { OrderDTO } from "@/lib/order.dto";
import { totalCopies, formatCurrency } from "@/lib/order-status";
import { neoBtn, neoBtnPrimary } from "@/lib/styles";
import { AdminList } from "@/components/admin-list";
import { AdminPagination } from "@/components/admin-pagination";
import { StatusBadge } from "@/components/status-badge";

export function DispatchTable({
  paged,
  page,
  totalPages,
  setPage,
  onOpen,
  onAssign,
}: {
  paged: OrderDTO[];
  page: number;
  totalPages: number;
  setPage: (fn: (p: number) => number) => void;
  onOpen: (o: OrderDTO) => void;
  onAssign?: (o: OrderDTO) => void;
}) {
  const { t } = useTranslation();
  return (
    <AdminList
      columns={[
        { key: "orderId", label: t("admin.dispatch.orderId"), width: "110px" },
        { key: "customer", label: t("admin.dispatch.customer"), width: "1fr" },
        { key: "books", label: t("admin.dispatch.books"), width: "1.6fr" },
        { key: "copies", label: t("admin.dispatch.copies"), width: "80px", align: "center" },
        { key: "amount", label: t("admin.dispatch.amount"), width: "120px" },
        { key: "status", label: t("admin.dispatch.status"), width: "150px", align: "center" },
        { key: "date", label: t("admin.dispatch.date"), width: "130px" },
        { key: "action", label: t("common.action"), width: "80px", align: "center" },
      ]}
      data={paged}
      rowKey={(o) => String(o.id)}
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
      renderRow={(order: OrderDTO) => {
        const items = order.orderItems ?? [];
        const [first, ...rest] = items;
        return (
          <>
            <div className="px-2 font-mono text-[10px] font-bold text-[#3B82F6] whitespace-nowrap">{order.orderCode}</div>
            <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">
              {order.name || order.user?.name || "—"}
            </div>
            <div className="px-2 min-w-0">
              <p className="text-sm font-bold whitespace-nowrap truncate">{first?.title}</p>
              {(first?.quantity ?? 1) > 1 && (
                <p className="font-mono text-[9px] font-bold text-[#999]">×{first!.quantity}</p>
              )}
              {rest.length > 0 && (
                <p className="font-mono text-[9px] font-bold text-[#999] whitespace-nowrap truncate">
                  {t("admin.dispatch.moreBooks", { count: rest.length })}:{" "}
                  {rest.map((i) => i.title).join(", ")}
                </p>
              )}
            </div>
            <div className="px-2 flex justify-center">
              <span className="font-mono text-[10px] font-bold bg-[#222]/5 px-2 py-0.5 rounded-full whitespace-nowrap">
                ×{totalCopies(order)}
              </span>
            </div>
            <div className="px-2 font-mono text-[10px] font-bold whitespace-nowrap">{formatCurrency(order.totalAmount)}</div>
            <div className="px-2 flex justify-center">
              <StatusBadge status={order.status} />
            </div>
            <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">
              {new Date(order.createdAt).toLocaleDateString()}
            </div>
            <div className="px-2 flex justify-center gap-1.5">
              <button onClick={() => onOpen(order)} className={`${neoBtn} p-1.5`}>
                <Eye size={14} />
              </button>
              {onAssign && (order.status === "paid" || order.status === "partially_paid") && !order.supplierId && (
                <button
                  onClick={() => onAssign(order)}
                  title="Assign supplier"
                  className={`${neoBtnPrimary} p-1.5`}
                >
                  <UserPlus size={14} />
                </button>
              )}
            </div>
          </>
        );
      }}
    />
  );
}
