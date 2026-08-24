"use client";

import { useTranslation } from "react-i18next";
import { CloseButton } from "@/components/ui/close-button";
import { label, labelSm, neoBtn, neoBtnPrimary, infoBox } from "@/lib/styles";
import type { Order, OrderStatus } from "@/lib/mock-dispatch";
import { dispatchSuppliers } from "@/lib/mock-dispatch";
import { STATUS_META, formatCurrency } from "../_lib/utils";

export function OrderDetailDrawer({
  order,
  onUpdateStatus,
  onClose,
}: {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const statusMeta = STATUS_META(t);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]"
        style={{ width: 400 }}
      >
        <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
          <div>
            <p className={`${label} mb-1 text-[#666]`}>{order.id}</p>
            <h2 className="text-xl font-bold truncate max-w-[280px]">{order.product}</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-3">{t("admin.dispatch.status")}</h3>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(statusMeta) as OrderStatus[]).map((s) => {
                const active = order.status === s;
                const m = statusMeta[s];
                return (
                  <button
                    key={s}
                    onClick={() => onUpdateStatus(order.id, s)}
                    className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none transition-[opacity,border-color] rounded-[6px] px-2.5 py-1.5 border-2 ${
                      active
                        ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100"
                        : "border-transparent opacity-40 hover:opacity-70"
                    }`}
                    style={{ background: m.color, color: m.text }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.customerInfo")}</h3>
            <div className="space-y-3">
              {[
                [t("admin.dispatch.name"), order.customer],
                [t("admin.dispatch.email"), order.email],
                [t("admin.dispatch.phone"), order.phone],
                [t("admin.dispatch.address"), order.address],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p>
                  <p className="text-sm font-bold">{v || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.orderDetails")}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                [t("admin.dispatch.pages"), `${order.pages}${t("admin.dispatch.pp")}`],
                [t("admin.dispatch.cover"), order.cover],
                [t("admin.dispatch.amount"), formatCurrency(order.amount)],
                [t("admin.dispatch.date"), order.date],
                [t("admin.dispatch.supplierDetail"), dispatchSuppliers.find((s) => s.id === order.supplierId)?.name || "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p>
                  <p className="font-mono text-[10px] font-bold capitalize">{v}</p>
                </div>
              ))}
            </div>
            {order.notes && (
              <div className={`mt-4 p-3 ${infoBox}`}>
                <p className="font-mono text-[9px] font-bold mb-1 text-[#999]">{t("admin.dispatch.note")}</p>
                <p className="text-sm font-bold">{order.notes}</p>
              </div>
            )}
          </div>

          <div className="px-6 py-5">
            <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.timeline")}</h3>
            <div className="relative">
              <div className="absolute left-[5px] top-2 bottom-2 w-[3px] bg-[#222]/20 rounded-full" />
              <div className="space-y-4">
                {order.timeline.map((tl, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div
                      className="shrink-0 w-3 h-3 rounded-full mt-1 relative z-10"
                      style={{
                        background: i === order.timeline.length - 1 ? "#222" : "#FFF7D6",
                        border: "3px solid #222",
                      }}
                    />
                    <div>
                      <p className="text-sm font-bold">{tl.label}</p>
                      <p className="font-mono text-[9px] font-bold mt-0.5 text-[#999]">{tl.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-3 shrink-0 border-t-[3px] border-[#222]">
          <button className={`${neoBtn} ${labelSm} py-3 px-4 shrink-0`}>{t("admin.dispatch.printLabel")}</button>
          <button className={`${neoBtn} ${labelSm} flex-1 py-3`}>{t("admin.dispatch.viewJournal")}</button>
          <button onClick={() => onUpdateStatus(order.id, "shipped")} className={`${neoBtnPrimary} flex-1 py-3`}>
            {t("admin.dispatch.markShipped")}
          </button>
        </div>
      </div>
    </>
  );
}
