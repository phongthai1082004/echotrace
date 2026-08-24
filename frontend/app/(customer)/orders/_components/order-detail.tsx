"use client";

import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import Image from "next/image";
import { infoBox } from "@/lib/styles";
import { statusMeta, timelineKeyMap, type Order } from "../_lib/mock-orders";

function Timeline({ steps, t }: { steps: { label: string; date: string; done: boolean }[]; t: any }) {
  return (
    <div className="relative">
      <div className="absolute left-[5px] top-1 bottom-1 w-[3px] bg-[#222]/15 rounded-full" />
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="shrink-0 w-3 h-3 rounded-full mt-1 relative z-10"
              style={{ background: step.done ? "#222" : "#FFF7D6", border: "3px solid #222" }}
            />
            <div className={step.done ? "" : "opacity-40"}>
              <p className="text-sm font-bold">{t(timelineKeyMap[step.label] || step.label)}</p>
              {step.date && <p className="font-mono text-[9px] font-bold text-[#999] mt-0.5">{step.date}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed top-15 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-t-[3px] border-l-[3px] border-[#222] w-full sm:w-[420px]">
        <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
          <div>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">
              {order.orderCode}
            </p>
            <h2 className="text-xl font-bold">{t("customer.orders.orderDetails")}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#FFF7D6] rounded-lg border-2 border-[#222] hover:translate-x-px hover:translate-y-[1px] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
                {t("customer.orders.status")}
              </p>
              <span
                className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
                style={{ background: statusMeta[order.status].bg, color: statusMeta[order.status].text }}
              >
                {t(`customer.orders.statuses.${statusMeta[order.status].label}`)}
              </span>
            </div>
            <Timeline steps={order.timeline} t={t} />
          </div>

          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-4 text-[#666]">
              {t("customer.orders.items")}
            </p>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className={`flex gap-3 p-3 ${infoBox}`}>
                  <div className="w-14 h-18 rounded-md overflow-hidden bg-[#e8e6e0] shrink-0">
                    <Image src={item.coverUrl} alt={item.bookTitle} width={56} height={72} className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold mb-1">{item.bookTitle}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999]">
                        {item.style}
                      </span>
                      <span className="text-[#222]">·</span>
                      <span className="font-mono text-[8px] font-bold text-[#999]">
                        {item.pages} {t("customer.orders.pg")}
                      </span>
                      <span className="text-[#222]">·</span>
                      <span className="font-mono text-[8px] font-bold text-[#999]">{item.coverType}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-mono text-[9px] font-bold text-[#666]">x{item.quantity}</span>
                      <span className="font-mono text-[10px] font-bold">{item.price.toLocaleString()}₫</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">
              {t("customer.orders.payment")}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-mono text-[10px] font-bold text-[#666]">{t("customer.orders.subtotal")}</span>
                <span className="font-mono text-[10px] font-bold">{order.totalAmount.toLocaleString()}₫</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] font-bold text-[#5A8F4A]">
                    {t("customer.orders.discount")}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#5A8F4A]">
                    -{order.discountAmount.toLocaleString()}₫
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-[2px] border-[#222]">
                <span className="font-mono text-[10px] font-bold">{t("customer.orders.total")}</span>
                <span className="font-mono text-[12px] font-bold">{order.totalAmount.toLocaleString()}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] font-bold text-[#666]">{t("customer.orders.paid")}</span>
                <span className="font-mono text-[10px] font-bold text-[#5A8F4A]">
                  {order.paidAmount.toLocaleString()}₫
                </span>
              </div>
              {order.paidAmount < order.totalAmount && (
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] font-bold text-[#B54843]">
                    {t("customer.orders.remaining")}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#B54843]">
                    {(order.totalAmount - order.paidAmount).toLocaleString()}₫
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-mono text-[10px] font-bold text-[#666]">{t("customer.orders.method")}</span>
                <span className="font-mono text-[10px] font-bold">
                  {order.paymentMethod === "DEPOSIT" ? t("customer.orders.deposit") : t("customer.orders.fullPayment")}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">
              {t("customer.orders.delivery")}
            </p>
            <div className="space-y-2">
              {[
                ["name", order.name],
                ["phone", order.phone],
                ["address", order.address],
                ["city", order.city],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="font-mono text-[9px] font-bold text-[#999]">{t(`customer.orders.${k}`)}</span>
                  <span className="text-sm font-bold text-right">{v}</span>
                </div>
              ))}
              {order.note && (
                <div className={`mt-3 p-3 ${infoBox}`}>
                  <p className="font-mono text-[9px] font-bold mb-1 text-[#999]">{t("customer.orders.note")}</p>
                  <p className="text-sm font-bold">{order.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
