"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { kanbanOrders, type KanbanStatus } from "@/features/order-kanban/data";
import { Dialog } from "@/components/ui/dialog";

const STATUS_META: Record<KanbanStatus, { label: string; color: string; text: string }> = {
  pending:        { label: "Pending",       color: "#e8e6e0", text: "#6b6962" },
  printing:       { label: "Printing",      color: "#C4A882", text: "#5a4a32" },
  "quality-check":{ label: "Quality Check", color: "#9CB8A8", text: "#2e5040" },
  shipped:        { label: "Shipped",       color: "#0D1F1A", text: "#FDFBF7" },
};

type FullOrder = typeof FULL_ORDERS[number];

const FULL_ORDERS = kanbanOrders.map((o, i) => ({
  ...o,
  email: ["amara@gmail.com","lea.b@outlook.fr","h.tanaka@yahoo.jp","sofia.m@gmail.com","m.rossi@libero.it","priya.n@gmail.com","j.okonkwo@gmail.com"][i],
  phone: ["+84 91 234 5678","+33 6 12 34 56 78","+81 90 1234 5678","+358 40 123 4567","+39 320 123 4567","+91 98765 43210","+234 801 234 5678"][i],
  address: ["12 Nguyễn Huệ, Hà Nội","8 Rue du Faubourg, Paris","2-4-1 Shinjuku, Tokyo","Mannerheimintie 14, Helsinki","Via Roma 32, Milano","MG Road 5, Bengaluru","15 Adeola Odeku St, Lagos"][i],
  cover: ["softcover","hardcover","hardcover","softcover","hardcover","softcover","softcover"][i] as "softcover" | "hardcover",
  notes: ["Please use matte finish on cover.","Rush order — delivery by 15 July.","","Gift wrap requested.","Client requested spine embossing.","","Second order from this customer."][i],
  timeline: [
    [{ date: "2024-07-01", label: "Order placed" }, { date: "2024-07-01", label: "Payment confirmed" }],
    [{ date: "2024-06-28", label: "Order placed" }, { date: "2024-06-28", label: "Payment confirmed" }],
    [{ date: "2024-06-25", label: "Order placed" }, { date: "2024-06-25", label: "Payment confirmed" }, { date: "2024-06-26", label: "Printing started" }],
    [{ date: "2024-06-20", label: "Order placed" }, { date: "2024-06-20", label: "Payment confirmed" }, { date: "2024-06-21", label: "Printing started" }],
    [{ date: "2024-06-15", label: "Order placed" }, { date: "2024-06-16", label: "Payment confirmed" }, { date: "2024-06-17", label: "Printing started" }, { date: "2024-06-22", label: "Quality check" }],
    [{ date: "2024-06-10", label: "Order placed" }, { date: "2024-06-10", label: "Payment confirmed" }, { date: "2024-06-11", label: "Printing started" }, { date: "2024-06-14", label: "Quality check" }, { date: "2024-06-16", label: "Shipped" }],
    [{ date: "2024-06-05", label: "Order placed" }, { date: "2024-06-05", label: "Payment confirmed" }, { date: "2024-06-06", label: "Printing started" }, { date: "2024-06-08", label: "Quality check" }, { date: "2024-06-10", label: "Shipped" }],
  ][i],
}));

function StatusBadge({ status }: { status: KanbanStatus }) {
  const m = STATUS_META[status];
  return (
    <span style={{ background: m.color, color: m.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", display: "inline-block", lineHeight: 1, padding: "3px 6px 2px", whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<FullOrder[]>(FULL_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<KanbanStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "pages">("date");
  const [selectedOrder, setSelectedOrder] = useState<FullOrder | null>(null);

  const filtered = orders
    .filter((o) => {
      const q = search.toLowerCase();
      const matchSearch = !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.journal.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "date") return b.date.localeCompare(a.date);
      if (sortBy === "amount") return parseInt(b.amount.replace(/\D/g, "")) - parseInt(a.amount.replace(/\D/g, ""));
      return b.pages - a.pages;
    });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    printing: orders.filter((o) => o.status === "printing").length,
    "quality-check": orders.filter((o) => o.status === "quality-check").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
  };

  const updateStatus = (id: string, status: KanbanStatus) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    setSelectedOrder((prev) => prev?.id === id ? { ...prev, status } : prev);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-15">
      <div className="px-8 py-8" style={{ borderBottom: "0.5px solid #dbdad6" }}>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,26,0.38)" }}>Admin Panel</p>
            <h1 className="font-['Playfair_Display'] text-4xl text-[#1a1a1a]">Orders</h1>
          </div>
          <div className="flex items-center gap-3 lg:w-85" style={{ border: "0.5px solid #dbdad6" }}>
            <svg className="ml-3 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: "rgba(26,26,26,0.38)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, customer, journal…"
              className="flex-1 bg-transparent font-['Inter'] text-sm text-[#1a1a1a] py-2.5 pr-3 placeholder:text-[#1a1a1a]/30 focus:outline-none" />
            {search && <button onClick={() => setSearch("")} className="mr-2 opacity-40 hover:opacity-70"><X size={12} /></button>}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex" style={{ borderBottom: "0.5px solid #dbdad6" }}>
            {([["all", "All"], ["pending", "Pending"], ["printing", "Printing"], ["quality-check", "QC"], ["shipped", "Shipped"]] as [KanbanStatus | "all", string][]).map(([s, label]) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-3 flex items-center gap-2 transition-colors"
                style={{ color: statusFilter === s ? "#1a1a1a" : "rgba(26,26,26,0.38)", borderBottom: statusFilter === s ? "1px solid #1a1a1a" : "1px solid transparent", marginBottom: "-0.5px" }}>
                {label}
                <span className="font-['JetBrains_Mono'] text-[10px] px-1.5 py-0.5"
                  style={{ background: statusFilter === s ? "#1a1a1a" : "#f5f3ef", color: statusFilter === s ? "#FDFBF7" : "rgba(26,26,26,0.5)" }}>{counts[s]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest" style={{ color: "rgba(26,26,26,0.38)" }}>Sort</span>
            {([["date", "Date"], ["amount", "Amount"], ["pages", "Pages"]] as ["date" | "amount" | "pages", string][]).map(([k, label]) => (
              <button key={k} onClick={() => setSortBy(k)}
                className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-2.5 py-1.5 transition-colors"
                style={{ border: `0.5px solid ${sortBy === k ? "#1a1a1a" : "#dbdad6"}`, background: sortBy === k ? "#1a1a1a" : "transparent", color: sortBy === k ? "#FDFBF7" : "rgba(26,26,26,0.5)" }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="grid px-8 py-2.5" style={{ gridTemplateColumns: "2fr 2fr 2fr 1fr 1fr 1.5fr 1fr", borderBottom: "0.5px solid #dbdad6" }}>
          {["Order ID", "Customer", "Journal", "Pages", "Amount", "Status", "Date"].map((h) => (
            <span key={h} className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.35)" }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-8 py-16 text-center">
            <p className="font-['Playfair_Display'] text-2xl text-[#1a1a1a] mb-2">No orders found</p>
            <p className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.35)" }}>Try adjusting your search or filter</p>
          </div>
        )}
        {filtered.map((order) => (
          <div key={order.id} onClick={() => setSelectedOrder(order)}
            className="grid px-8 py-4 cursor-pointer hover:bg-[#f5f3ef] transition-colors items-center"
            style={{ gridTemplateColumns: "2fr 2fr 2fr 1fr 1fr 1.5fr 1fr", borderBottom: "0.5px solid #dbdad6" }}>
            <span className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.45)" }}>{order.id}</span>
            <div>
              <p className="font-['Inter'] text-sm text-[#1a1a1a]">{order.customer}</p>
              <p className="font-['JetBrains_Mono'] text-[9px] mt-0.5" style={{ color: "rgba(26,26,26,0.35)" }}>{order.email}</p>
            </div>
            <span className="font-['Playfair_Display'] text-sm text-[#1a1a1a]">{order.journal}</span>
            <span className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.5)" }}>{order.pages}</span>
            <span className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">{order.amount}</span>
            <StatusBadge status={order.status} />
            <span className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.38)" }}>{order.date}</span>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(26,26,26,0.18)" }} onClick={() => setSelectedOrder(null)} />
          <div className="fixed top-15 right-0 bottom-0 z-50 bg-[#FDFBF7] flex flex-col overflow-hidden" style={{ width: 400, borderLeft: "0.5px solid #dbdad6" }}>
            <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: "0.5px solid #dbdad6" }}>
              <div>
                <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,26,0.38)" }}>{selectedOrder.id}</p>
                <h2 className="font-['Playfair_Display'] text-2xl text-[#1a1a1a]">{selectedOrder.journal}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-[#f5f3ef]"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <div className="px-6 py-5" style={{ borderBottom: "0.5px solid #dbdad6" }}>
                <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Status</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_META) as KanbanStatus[]).map((s) => {
                    const active = selectedOrder.status === s;
                    const m = STATUS_META[s];
                    return (
                      <button key={s} onClick={() => updateStatus(selectedOrder.id, s)}
                        className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase leading-none transition-opacity"
                        style={{ background: m.color, color: m.text, padding: "4px 10px 3px", opacity: active ? 1 : 0.38, outline: active ? `1.5px solid ${m.text === "#FDFBF7" ? "#0D1F1A" : m.text}` : "none", outlineOffset: 2 }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-5" style={{ borderBottom: "0.5px solid #dbdad6" }}>
                <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-4" style={{ color: "rgba(26,26,26,0.38)" }}>Customer</p>
                <div className="space-y-3">
                  {[["Name", selectedOrder.customer], ["Email", selectedOrder.email], ["Phone", selectedOrder.phone], ["Address", selectedOrder.address]].map(([k, v]) => (
                    <div key={k}><p className="font-['JetBrains_Mono'] text-[9px] mb-0.5" style={{ color: "rgba(26,26,26,0.38)" }}>{k}</p><p className="font-['Inter'] text-sm text-[#1a1a1a]">{v}</p></div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-5" style={{ borderBottom: "0.5px solid #dbdad6" }}>
                <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-4" style={{ color: "rgba(26,26,26,0.38)" }}>Order Details</p>
                <div className="grid grid-cols-2 gap-4">
                  {[["Pages", `${selectedOrder.pages}pp`], ["Cover", selectedOrder.cover], ["Amount", selectedOrder.amount], ["Date", selectedOrder.date]].map(([k, v]) => (
                    <div key={k}><p className="font-['JetBrains_Mono'] text-[9px] mb-0.5" style={{ color: "rgba(26,26,26,0.38)" }}>{k}</p><p className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a] capitalize">{v}</p></div>
                  ))}
                </div>
                {selectedOrder.notes && (
                  <div className="mt-4 p-3" style={{ background: "#f5f3ef", border: "0.5px solid #dbdad6" }}>
                    <p className="font-['JetBrains_Mono'] text-[9px] mb-1" style={{ color: "rgba(26,26,26,0.38)" }}>Note</p>
                    <p className="font-['Inter'] text-sm text-[#1a1a1a]">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-5">
                <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-4" style={{ color: "rgba(26,26,26,0.38)" }}>Timeline</p>
                <div className="relative">
                  <div className="absolute left-1.25 top-2 bottom-2 w-px bg-[#dbdad6]" />
                  <div className="space-y-4">
                    {selectedOrder.timeline.map((t, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="shrink-0 w-2.75 h-2.75 rounded-full mt-1"
                          style={{ background: i === selectedOrder.timeline.length - 1 ? "#0D1F1A" : "#FDFBF7", border: `0.5px solid ${i === selectedOrder.timeline.length - 1 ? "#0D1F1A" : "#dbdad6"}`, position: "relative", zIndex: 1 }} />
                        <div>
                          <p className="font-['Inter'] text-sm text-[#1a1a1a]">{t.label}</p>
                          <p className="font-['JetBrains_Mono'] text-[9px] mt-0.5" style={{ color: "rgba(26,26,26,0.38)" }}>{t.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex gap-2 shrink-0" style={{ borderTop: "0.5px solid #dbdad6" }}>
              <button className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-3 px-4 hover:bg-[#f5f3ef] shrink-0" style={{ border: "0.5px solid #dbdad6" }}>Print Label</button>
              <button className="flex-1 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-3 hover:bg-[#f5f3ef]" style={{ border: "0.5px solid #dbdad6" }}>View Journal</button>
              <button onClick={() => updateStatus(selectedOrder.id, "shipped")}
                className="flex-1 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-3 bg-[#0D1F1A] text-[#FDFBF7] hover:bg-[#1a1a1a]">Mark Shipped</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
