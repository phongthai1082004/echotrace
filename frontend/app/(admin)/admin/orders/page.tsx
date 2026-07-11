"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { kanbanOrders, type KanbanStatus } from "@/features/order-kanban/data";
import { label, labelSm, card, neoBtn, neoBtnPrimary } from "@/lib/styles";

const STATUS_META: Record<KanbanStatus, { label: string; color: string; text: string }> = {
  pending:        { label: "Pending",       color: "#FFF7D6", text: "#222" },
  printing:       { label: "Printing",      color: "#FFD93D", text: "#222" },
  "quality-check":{ label: "Quality Check", color: "#9CB8A8", text: "#222" },
  shipped:        { label: "Shipped",       color: "#5A8F4A", text: "#fff" },
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
    <span className={`${label} rounded-md px-1.5 py-0.5 inline-block w-fit whitespace-nowrap`}
      style={{ background: m.color, color: m.text }}>
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
    <div>
      <div className="px-8 py-8 border-b-[3px] border-[#222]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className={`${label} mb-1 text-[#666]`}>Admin Panel</p>
            <h1 className="text-4xl font-bold">Orders</h1>
          </div>
          <div className={`flex items-center gap-3 lg:w-85 ${card}`}>
            <svg className="ml-3 shrink-0 text-[#999]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, customer, journal…"
              className="flex-1 bg-transparent text-sm font-bold py-2.5 pr-3 placeholder:text-[#999] focus:outline-none" />
            {search && <button onClick={() => setSearch("")} className="mr-2 opacity-40 hover:opacity-70"><X size={12} /></button>}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex border-b-[3px] border-[#222]">
            {([["all", "All"], ["pending", "Pending"], ["printing", "Printing"], ["quality-check", "QC"], ["shipped", "Shipped"]] as [KanbanStatus | "all", string][]).map(([s, label]) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 flex items-center gap-2 transition-all ${
                  statusFilter === s ? "text-[#222] border-b-[3px] border-[#222] -mb-[3px]" : "text-[#999]"
                }`}>
                {label}
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                  statusFilter === s ? "bg-[#222] text-white" : "bg-[#e8e6e0] text-[#666]"
                }`}>{counts[s]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#666]">Sort</span>
            {([["date", "Date"], ["amount", "Amount"], ["pages", "Pages"]] as ["date" | "amount" | "pages", string][]).map(([k, label]) => (
              <button key={k} onClick={() => setSortBy(k)}
                className={`font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-[6px] border-2 transition-all ${
                  sortBy === k ? "bg-[#222] text-white border-[#222] shadow-[2px_2px_0_#222]" : "border-[#222] text-[#666] hover:bg-[#FFF7D6]"
                }`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="grid px-8 py-2.5 border-b-[3px] border-[#222]" style={{ gridTemplateColumns: "2fr 2fr 2fr 1fr 1fr 1.5fr 1fr" }}>
          {["Order ID", "Customer", "Journal", "Pages", "Amount", "Status", "Date"].map((h) => (
            <span key={h} className={`${label} text-[#666]`}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-8 py-16 text-center">
            <p className="text-2xl font-bold mb-2">No orders found</p>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">Try adjusting your search or filter</p>
          </div>
        )}
        {filtered.map((order) => (
          <div key={order.id} onClick={() => setSelectedOrder(order)}
            className="grid px-8 py-4 cursor-pointer hover:bg-[#e8e6e0] transition-colors items-center border-b-[2px] border-[#222]/10"
            style={{ gridTemplateColumns: "2fr 2fr 2fr 1fr 1fr 1.5fr 1fr" }}>
            <span className="font-mono text-[10px] font-bold text-[#666]">{order.id}</span>
            <div>
              <p className="text-sm font-bold">{order.customer}</p>
              <p className="font-mono text-[9px] font-bold mt-0.5 text-[#999]">{order.email}</p>
            </div>
            <span className="text-sm font-bold">{order.journal}</span>
            <span className="font-mono text-[10px] font-bold text-[#666]">{order.pages}</span>
            <span className="font-mono text-[10px] font-bold">{order.amount}</span>
            <StatusBadge status={order.status} />
            <span className="font-mono text-[10px] font-bold text-[#999]">{order.date}</span>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedOrder(null)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]" style={{ width: 400 }}>
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div>
                <p className={`${label} mb-1 text-[#666]`}>{selectedOrder.id}</p>
                <h2 className="text-2xl font-bold">{selectedOrder.journal}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-[#FFF7D6] rounded-lg border-2 border-[#222] hover:translate-x-px hover:translate-y-[1px] transition-all"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <p className={`${label} mb-3 text-[#666]`}>Status</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_META) as KanbanStatus[]).map((s) => {
                    const active = selectedOrder.status === s;
                    const m = STATUS_META[s];
                    return (
                      <button key={s} onClick={() => updateStatus(selectedOrder.id, s)}
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none transition-all rounded-[6px] px-2.5 py-1.5 border-2 ${
                          active ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100" : "border-transparent opacity-40 hover:opacity-70"
                        }`}
                        style={{ background: m.color, color: m.text }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <p className={`${label} mb-4 text-[#666]`}>Customer</p>
                <div className="space-y-3">
                  {[["Name", selectedOrder.customer], ["Email", selectedOrder.email], ["Phone", selectedOrder.phone], ["Address", selectedOrder.address]].map(([k, v]) => (
                    <div key={k}><p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p><p className="text-sm font-bold">{v}</p></div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <p className={`${label} mb-4 text-[#666]`}>Order Details</p>
                <div className="grid grid-cols-2 gap-4">
                  {[["Pages", `${selectedOrder.pages}pp`], ["Cover", selectedOrder.cover], ["Amount", selectedOrder.amount], ["Date", selectedOrder.date]].map(([k, v]) => (
                    <div key={k}><p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p><p className="font-mono text-[10px] font-bold capitalize">{v}</p></div>
                  ))}
                </div>
                {selectedOrder.notes && (
                  <div className="mt-4 p-3 bg-[#FFF7D6] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222]">
                    <p className="font-mono text-[9px] font-bold mb-1 text-[#999]">Note</p>
                    <p className="text-sm font-bold">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-5">
                <p className={`${label} mb-4 text-[#666]`}>Timeline</p>
                <div className="relative">
                  <div className="absolute left-[5px] top-2 bottom-2 w-[3px] bg-[#222]/20 rounded-full" />
                  <div className="space-y-4">
                    {selectedOrder.timeline.map((t, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="shrink-0 w-3 h-3 rounded-full mt-1 relative z-10"
                          style={{ background: i === selectedOrder.timeline.length - 1 ? "#222" : "#FFF7D6", border: "3px solid #222" }} />
                        <div>
                          <p className="text-sm font-bold">{t.label}</p>
                          <p className="font-mono text-[9px] font-bold mt-0.5 text-[#999]">{t.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex gap-2 shrink-0 border-t-[3px] border-[#222]">
              <button className={`${neoBtn} ${labelSm} py-3 px-4 shrink-0`}>Print Label</button>
              <button className={`${neoBtn} ${labelSm} flex-1 py-3`}>View Journal</button>
              <button onClick={() => updateStatus(selectedOrder.id, "shipped")}
                className={`${neoBtnPrimary} flex-1 py-3`}>Mark Shipped</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
