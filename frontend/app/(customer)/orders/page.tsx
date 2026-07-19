"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { SkeletonCardRow } from "@/components/skeleton";
import { useVisibleCards } from "@/lib/use-container-query";

interface OrderItem {
  id: number;
  bookTitle: string;
  coverUrl: string;
  pages: number;
  style: string;
  coverType: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  status: "pending" | "printing" | "quality-check" | "shipped" | "delivered";
  orderCode: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  paymentMethod: "FULL" | "DEPOSIT";
  name: string;
  phone: string;
  address: string;
  city: string;
  note: string;
  timeline: { label: string; date: string; done: boolean }[];
}

const mockOrders: Order[] = [
  {
    id: "1", date: "2024-07-01", status: "pending", orderCode: "TC-0041",
    items: [{ id: 1, bookTitle: "West Africa Circuit", coverUrl: "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=400&h=530&fit=crop&auto=format", pages: 48, style: "modern", coverType: "softcover", quantity: 1, price: 490000 }],
    totalAmount: 490000, paidAmount: 0, discountAmount: 0, paymentMethod: "FULL",
    name: "Amara Osei", phone: "+84 91 234 5678", address: "12 Nguyễn Huệ", city: "Hà Nội", note: "",
    timeline: [{ label: "Order placed", date: "2024-07-01", done: true }, { label: "Payment confirmed", date: "", done: false }, { label: "Printing", date: "", done: false }, { label: "Shipped", date: "", done: false }],
  },
  {
    id: "2", date: "2024-06-15", status: "quality-check", orderCode: "TC-0033",
    items: [{ id: 2, bookTitle: "Dolomite Journals", coverUrl: "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=400&h=530&fit=crop&auto=format", pages: 56, style: "classic", coverType: "hardcover", quantity: 1, price: 690000 }],
    totalAmount: 690000, paidAmount: 690000, discountAmount: 0, paymentMethod: "FULL",
    name: "Lea Bisset", phone: "+33 6 12 34 56 78", address: "8 Rue du Faubourg", city: "Paris", note: "Rush order — delivery by 15 July.",
    timeline: [{ label: "Order placed", date: "2024-06-15", done: true }, { label: "Payment confirmed", date: "2024-06-15", done: true }, { label: "Quality check", date: "2024-06-22", done: true }, { label: "Shipped", date: "", done: false }],
  },
  {
    id: "3", date: "2024-06-05", status: "shipped", orderCode: "TC-0029",
    items: [{ id: 3, bookTitle: "Lagos to Accra", coverUrl: "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=400&h=530&fit=crop&auto=format", pages: 32, style: "vintage", coverType: "softcover", quantity: 1, price: 390000 }],
    totalAmount: 390000, paidAmount: 390000, discountAmount: 0, paymentMethod: "FULL",
    name: "Hiro Tanaka", phone: "+81 90 1234 5678", address: "2-4-1 Shinjuku", city: "Tokyo", note: "",
    timeline: [{ label: "Order placed", date: "2024-06-05", done: true }, { label: "Payment confirmed", date: "2024-06-05", done: true }, { label: "Printing", date: "2024-06-06", done: true }, { label: "Shipped", date: "2024-06-10", done: true }],
  },
  {
    id: "4", date: "2024-05-12", status: "delivered", orderCode: "TC-0021",
    items: [{ id: 4, bookTitle: "Mekong Delta", coverUrl: "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=400&h=530&fit=crop&auto=format", pages: 40, style: "modern", coverType: "hardcover", quantity: 1, price: 590000 }],
    totalAmount: 590000, paidAmount: 590000, discountAmount: 0, paymentMethod: "FULL",
    name: "Sofia Martens", phone: "+358 40 123 4567", address: "Mannerheimintie 14", city: "Helsinki", note: "Gift wrap requested.",
    timeline: [{ label: "Order placed", date: "2024-05-12", done: true }, { label: "Payment confirmed", date: "2024-05-12", done: true }, { label: "Printing", date: "2024-05-13", done: true }, { label: "Delivered", date: "2024-05-25", done: true }],
  },
];

const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "pending", bg: "#FFF7D6", text: "#222" },
  printing: { label: "printing", bg: "#FFD93D", text: "#222" },
  "quality-check": { label: "qc", bg: "#9CB8A8", text: "#222" },
  shipped: { label: "shipped", bg: "#5A8F4A", text: "#fff" },
  delivered: { label: "delivered", bg: "#5A8F4A", text: "#fff" },
};

function Timeline({ steps, t }: { steps: { label: string; date: string; done: boolean }[]; t: any }) {
  return (
    <div className="relative">
      <div className="absolute left-[5px] top-1 bottom-1 w-[3px] bg-[#222]/15 rounded-full" />
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="shrink-0 w-3 h-3 rounded-full mt-1 relative z-10"
              style={{ background: step.done ? "#222" : "#FFF7D6", border: "3px solid #222" }} />
            <div className={step.done ? "" : "opacity-40"}>
              <p className="text-sm font-bold">{step.label}</p>
              {step.date && <p className="font-mono text-[9px] font-bold text-[#999] mt-0.5">{step.date}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { ref: skeletonRef, visibleCount } = useVisibleCards<HTMLDivElement>(300, 20);

  useEffect(() => {
    const start = Date.now();
    const timer = setTimeout(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= 500) setLoading(false);
      else setTimeout(() => setLoading(false), 500 - elapsed);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
        <h1 className="text-3xl max-[1600px]:text-2xl max-[1440px]:text-xl max-[1280px]:text-lg font-bold">{t("customer.orders.title")}</h1>
        <p className="text-sm mt-1 text-[#666]">{t("customer.orders.subtitle")}</p>
      </div>

      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-10 max-[1600px]:py-8 max-[1440px]:py-6">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-5 text-[#666]">{t("customer.orders.history")}</p>
        <div className="overflow-x-auto -mx-8 px-8 pb-8" style={{ scrollbarWidth: "none" }} ref={skeletonRef}>
          {loading ? (
            <SkeletonCardRow count={Math.max(visibleCount, 2)} aspect="landscape" />
          ) : (
          <div className="flex gap-5" style={{ width: "max-content" }}>
            {mockOrders.map((order) => {
              const m = statusMeta[order.status];
              return (
                <div key={order.id} onClick={() => setSelectedOrder(order)}
                  className="shrink-0 w-72 group cursor-pointer bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
                  <div className="aspect-[4/3] bg-[#e8e6e0] overflow-hidden relative">
                    <div className="grid grid-cols-2 h-full">
                      {order.items.slice(0, 2).map((item) => (
                        <div key={item.id} className="relative overflow-hidden">
                          <img src={cloudinaryUrl(item.coverUrl)} alt={item.bookTitle} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                      {order.items.length === 1 && (
                        <div className="flex items-center justify-center bg-[#e8e6e0]">
                          <span className="font-mono text-[8px] font-bold text-[#999]">{t("customer.orders.more", { count: order.items.length - 1 })}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
                        style={{ background: m.bg, color: m.text }}>{t(`customer.orders.${m.label}`)}</span>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="font-mono text-[9px] font-bold text-white bg-[#222]/70 px-2 py-0.5 rounded-md">
                        {order.totalAmount.toLocaleString()}₫
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border-t-[3px] border-[#222]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{order.orderCode}</p>
                      <p className="font-mono text-[9px] font-bold text-[#999]">{order.date}</p>
                    </div>
                    <h3 className="text-base font-bold leading-tight mb-1">{order.items.map(i => i.bookTitle).join(", ")}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] font-bold text-[#666]">{order.items.reduce((s, i) => s + i.pages, 0)} {t("customer.orders.pages")}</span>
                      <span className="text-[#222]">·</span>
                      <span className="font-mono text-[9px] font-bold text-[#666]">{t("customer.orders.itemsCount", { count: order.items.length })}</span>
                      <span className="text-[#222]">·</span>
                      <span className="font-mono text-[9px] font-bold text-[#666]">{order.paymentMethod === "DEPOSIT" ? t("customer.orders.deposit") : t("customer.orders.fullPayment")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedOrder(null)} />
          <div className="fixed top-15 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-t-[3px] border-l-[3px] border-[#222]" style={{ width: 420 }}>
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">{selectedOrder.orderCode}</p>
                <h2 className="text-xl font-bold">{t("customer.orders.orderDetails")}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-[#FFF7D6] rounded-lg border-2 border-[#222] hover:translate-x-px hover:translate-y-[1px] transition-all"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">{t("customer.orders.status")}</p>
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
                    style={{ background: statusMeta[selectedOrder.status].bg, color: statusMeta[selectedOrder.status].text }}>
                    {t(`customer.orders.${statusMeta[selectedOrder.status].label}`)}
                  </span>
                </div>
                <Timeline steps={selectedOrder.timeline} t={t} />
              </div>

              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-4 text-[#666]">{t("customer.orders.items")}</p>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 bg-[#FFF7D6] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222]">
                      <div className="w-14 h-18 rounded-md overflow-hidden bg-[#e8e6e0] shrink-0">
                        <img src={item.coverUrl} alt={item.bookTitle} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold mb-1">{item.bookTitle}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999]">{item.style}</span>
                          <span className="text-[#222]">·</span>
                          <span className="font-mono text-[8px] font-bold text-[#999]">{item.pages} {t("customer.orders.pg")}</span>
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
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">{t("customer.orders.payment")}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] font-bold text-[#666]">{t("customer.orders.subtotal")}</span>
                    <span className="font-mono text-[10px] font-bold">{selectedOrder.totalAmount.toLocaleString()}₫</span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#5A8F4A]">{t("customer.orders.discount")}</span>
                      <span className="font-mono text-[10px] font-bold text-[#5A8F4A]">-{selectedOrder.discountAmount.toLocaleString()}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t-[2px] border-[#222]">
                    <span className="font-mono text-[10px] font-bold">{t("customer.orders.total")}</span>
                    <span className="font-mono text-[12px] font-bold">{selectedOrder.totalAmount.toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] font-bold text-[#666]">{t("customer.orders.paid")}</span>
                    <span className="font-mono text-[10px] font-bold text-[#5A8F4A]">{selectedOrder.paidAmount.toLocaleString()}₫</span>
                  </div>
                  {selectedOrder.paidAmount < selectedOrder.totalAmount && (
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#B54843]">{t("customer.orders.remaining")}</span>
                      <span className="font-mono text-[10px] font-bold text-[#B54843]">{(selectedOrder.totalAmount - selectedOrder.paidAmount).toLocaleString()}₫</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] font-bold text-[#666]">{t("customer.orders.method")}</span>
                    <span className="font-mono text-[10px] font-bold">{selectedOrder.paymentMethod === "DEPOSIT" ? t("customer.orders.deposit") : t("customer.orders.fullPayment")}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">{t("customer.orders.delivery")}</p>
                <div className="space-y-2">
                  {[["name", selectedOrder.name], ["phone", selectedOrder.phone], ["address", selectedOrder.address], ["city", selectedOrder.city]].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="font-mono text-[9px] font-bold text-[#999]">{t(`customer.orders.${k}`)}</span>
                      <span className="text-sm font-bold text-right">{v}</span>
                    </div>
                  ))}
                  {selectedOrder.note && (
                    <div className="mt-3 p-3 bg-[#FFF7D6] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222]">
                      <p className="font-mono text-[9px] font-bold mb-1 text-[#999]">{t("customer.orders.note")}</p>
                      <p className="text-sm font-bold">{selectedOrder.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
