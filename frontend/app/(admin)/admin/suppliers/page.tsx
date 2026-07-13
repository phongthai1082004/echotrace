"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { label, card, input, neoBtnPrimary } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { AdminPagination } from "@/components/admin-pagination";
import type { Supplier, SupplierStatus } from "@/lib/mock-suppliers";
import { MOCK_SUPPLIERS, formatCurrency } from "@/lib/mock-suppliers";

const colWidths = ["60px", "1.5fr", "1fr", "1.2fr", "90px", "110px", "100px", "100px"];
const gridCols = colWidths.join(" ");

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SupplierStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", contact: "", email: "" });
  const perPage = 8;

  const toggleStatus = (id: number) => {
    setSuppliers((prev) => prev.map((s) =>
      s.id === id ? { ...s, status: s.status === "active" ? "inactive" as const : "active" as const } : s
    ));
  };

  const openEdit = (supplier: Supplier) => {
    setEditForm({ name: supplier.name, contact: supplier.contact, email: supplier.email });
    setEditingSupplier(supplier);
  };

  const saveEdit = () => {
    if (!editingSupplier) return;
    setSuppliers((prev) => prev.map((s) =>
      s.id === editingSupplier.id ? { ...s, ...editForm } : s
    ));
    setEditingSupplier(null);
  };

  const openAdd = () => {
    setEditForm({ name: "", contact: "", email: "" });
    setShowAdd(true);
  };

  const saveAdd = () => {
    if (!editForm.name.trim()) return;
    const newId = Math.max(...suppliers.map((s) => s.id)) + 1;
    setSuppliers((prev) => [...prev, { id: newId, name: editForm.name, contact: editForm.contact, email: editForm.email, activeOrders: 0, totalDebt: 0, overdueDebt: 0, status: "active" }]);
    setShowAdd(false);
  };

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || String(s.id).includes(q)) &&
      (filter === "all" || s.status === filter);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label="Admin — Suppliers" title="Suppliers">
        <div className="flex items-center gap-3">
          <AdminSearch value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name, email, ID…" />
          <button onClick={openAdd}
            className="bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-[transform,box-shadow] font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0">
            + Add Supplier
          </button>
        </div>
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 py-6 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: "All", count: suppliers.length },
            { key: "active", label: "Active", count: suppliers.filter((s) => s.status === "active").length },
            { key: "inactive", label: "Inactive", count: suppliers.filter((s) => s.status === "inactive").length },
          ]}
          selected={filter}
          onChange={(k) => { setFilter(k as SupplierStatus | "all"); setPage(0); }}
        />

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="grid shrink-0 border-b-[3px] border-[#222]" style={{ gridTemplateColumns: gridCols }}>
              {["ID", "Name", "Contact", "Email", "Orders", "Total Debt", "Overdue", "Status"].map((h) => (
                <div key={h} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</div>
              ))}
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              {paged.length === 0 ? (
                <div className="flex-1 flex items-center justify-center"><p className="text-lg font-bold">No suppliers found</p></div>
              ) : (
                paged.map((supplier) => (
                  <div key={supplier.id}
                    className="grid flex-1 hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10 items-center cursor-pointer"
                    style={{ gridTemplateColumns: gridCols }} onClick={() => openEdit(supplier)}>
                    <div className="px-2 font-mono text-[10px] font-bold text-[#666] whitespace-nowrap">{supplier.id}</div>
                    <div className="px-2 text-sm font-bold whitespace-nowrap">{supplier.name}</div>
                    <div className="px-2 font-mono text-[10px] font-bold text-[#666] whitespace-nowrap">{supplier.contact}</div>
                    <div className="px-2 text-sm font-bold whitespace-nowrap truncate">{supplier.email}</div>
                    <div className="px-2 font-mono text-[10px] font-bold text-[#3B82F6] whitespace-nowrap">{supplier.activeOrders}</div>
                    <div className="px-2 font-mono text-[10px] font-bold whitespace-nowrap">{formatCurrency(supplier.totalDebt)}</div>
                    <div className={`px-2 font-mono text-[10px] font-bold whitespace-nowrap ${supplier.overdueDebt > 0 ? "text-[#B54843]" : "text-[#999]"}`}>
                      {supplier.overdueDebt > 0 ? formatCurrency(supplier.overdueDebt) : "—"}
                    </div>
                    <div className="px-2 whitespace-nowrap">
                      <button onClick={(e) => { e.stopPropagation(); toggleStatus(supplier.id); }}
                        className={`font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 cursor-pointer transition-opacity hover:opacity-80 ${
                          supplier.status === "active"
                            ? "bg-[#D4EDDA] text-[#155724] border-[#155724]"
                            : "bg-[#F8D7DA] text-[#721C24] border-[#721C24]"
                        }`}>{supplier.status}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <AdminPagination page={page} totalPages={totalPages} total={filtered.length} perPage={perPage} onPageChange={setPage} />
        </div>
      </div>

      {/* edit modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
          onClick={() => setEditingSupplier(null)}>
          <div className={`${card} w-96 p-6`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-bold text-sm">Edit Supplier</p>
              <button onClick={() => setEditingSupplier(null)} className="p-1 hover:opacity-60"><X size={14} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">Name</p>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={input} />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">Contact</p>
                <input type="text" value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} className={input} />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">Email</p>
                <input type="text" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={input} />
              </div>
              <button onClick={saveEdit} className={`${neoBtnPrimary} w-full mt-2`}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
          onClick={() => setShowAdd(false)}>
          <div className={`${card} w-96 p-6`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-bold text-sm">Add Supplier</p>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:opacity-60"><X size={14} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">Name *</p>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={input} placeholder="e.g. New Paper Co." />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">Contact</p>
                <input type="text" value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} className={input} placeholder="+1 555-0000" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">Email</p>
                <input type="text" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={input} placeholder="contact@newpaper.com" />
              </div>
              <button onClick={saveAdd} className={`${neoBtnPrimary} w-full mt-2`}>Add Supplier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

