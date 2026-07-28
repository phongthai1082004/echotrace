"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { label, card, neoBtn, neoBtnPrimary, input } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { ResponsiveTable } from "@/components/responsive-table";
import { apiFetch } from "@/lib/api.fetch";
import { Supplier } from "@/models/supplier/supplier";
import { SupplierResponse } from "@/models/supplier/supplier.list";
import { useToast } from "@/components/toast";
import { SkeletonTable } from "@/components/skeleton";
import { Eye, X, Save } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { timeSince } from "@/lib/duration";

const colWidths = ["1.75fr", "1.25fr", "1fr", "100px", "100px", "100px", "80px", "60px"];
const gridCols = colWidths.join(" ");

const STATUS = ["active", "banned"] as const;

export default function AdminSuppliersPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: "", contact: "", email: "", status: "active" as string,
    bankName: "", bankAccountNumber: "", bankAccountName: "",
  });

  const fetchSuppliers = async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (search) params.set("search", search);
    try {
      const data = await apiFetch<SupplierResponse>(`/api/admin/suppliers?${params.toString()}`, token);
      setSuppliers(data.items ?? []);
    } catch { showToast(t("admin.suppliers.fetchFailed"), "error"); }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchSuppliers().finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timeout = setTimeout(fetchSuppliers, 300);
    return () => clearTimeout(timeout);
  }, [search, filter, token]);

  const openDetail = async (s: Supplier) => {
    try {
      const data = await apiFetch<Supplier>(`/api/admin/suppliers/${s.id}`, token);
      setSelected(data);
      setForm({
        name: data.name, contact: data.contact, email: data.email, status: data.status,
        bankName: data.bankName ?? "", bankAccountNumber: data.bankAccountNumber ?? "", bankAccountName: data.bankAccountName ?? "",
      });
    } catch { showToast(t("admin.suppliers.fetchFailed"), "error"); }
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await apiFetch(`/api/admin/suppliers/${selected.id}`, token, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setSuppliers((prev) => prev.map((s) => s.id === selected.id ? { ...s, ...form } : s));
      setSelected((prev) => prev ? { ...prev, ...form } : null);
      showToast(t("admin.suppliers.saveSuccess"), "success");
    } catch { showToast(t("admin.suppliers.saveFailed"), "error"); }
  };

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.suppliers.label")} title={t("admin.suppliers.title")}>
        <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.suppliers.searchPlaceholder")} />
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 max-[1440px]:py-4 max-[1280px]:py-3 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: t("admin.filterTabs.all") },
            { key: "active", label: t("admin.filterTabs.active") },
            { key: "banned", label: t("admin.filterTabs.banned") },
          ]}
          selected={filter}
          onChange={(k) => setFilter(k)}
        />

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
          {loading ? (
            <SkeletonTable rows={8} cols={colWidths} />
          ) : (<>
          <ResponsiveTable
            header={
              <div className="grid shrink-0 border-b-[3px] border-[#222]" style={{ gridTemplateColumns: gridCols }}>
                {[t("admin.suppliers.name"), t("admin.suppliers.email"), t("admin.suppliers.contact"), t("admin.suppliers.totalDebt"), t("admin.suppliers.overdueDebt"), t("admin.suppliers.monthDebt"), t("admin.suppliers.status"), t("common.action")].map((h) => (
                  <div key={h} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</div>
                ))}
              </div>
            }
            gridCols={gridCols}
          >
            {suppliers.length === 0 ? (
              <div className="flex items-center justify-center py-10"><p className="text-lg font-bold">{t("admin.suppliers.noSuppliers")}</p></div>
            ) : (
              suppliers.map((s) => (
                <div key={s.id}
                  className="grid hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10 items-center py-3"
                  style={{ gridTemplateColumns: gridCols }}>
                  <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.name}</div>
                  <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.email}</div>
                  <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.contact}</div>
                  <div className="px-2 font-mono text-[11px] font-bold text-[#22C55E] whitespace-nowrap">{s.totalDebt ? `₫${s.totalDebt.toLocaleString()}` : "—"}</div>
                  <div className="px-2 font-mono text-[11px] font-bold text-[#B54843] whitespace-nowrap">{s.overdueDebt ? `₫${s.overdueDebt.toLocaleString()}` : "—"}</div>
                  <div className="px-2 font-mono text-[11px] font-bold text-[#D97706] whitespace-nowrap">{s.monthDebt ? `₫${s.monthDebt.toLocaleString()}` : "—"}</div>
                  <div className="px-2 whitespace-nowrap"><StatusBadge status={s.status} /></div>
                  <div className="px-2">
                    <button onClick={() => openDetail(s)} className={`${neoBtn} p-1.5`}>
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </ResponsiveTable>
          </>)}
        </div>
      </div>

      {/* ── DETAIL SIDEBAR ── */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]" style={{ width: 420 }}>
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div>
                <p className={`${label} mb-1 text-[#666]`}>{t("admin.suppliers.detailLabel")}</p>
                <h2 className="text-xl font-bold truncate max-w-[300px]">{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222] hover:translate-x-px hover:translate-y-[1px] transition-[transform,background-color]"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none">
              {/* Status */}
              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <h3 className="text-sm text-[#666] mb-3">{t("admin.suppliers.status")}</h3>
                <div className="flex gap-2">
                  {STATUS.map((s) => {
                    const active = form.status === s;
                    const meta = s === "active" ? { bg: "#D4EDDA", text: "#155724" } : { bg: "#F8D7DA", text: "#721C24" };
                    return (
                      <button key={s} onClick={() => setForm({ ...form, status: s })}
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none rounded-[6px] px-2.5 py-1.5 border-2 transition-[opacity,border-color] ${
                          active ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100" : "border-transparent opacity-40 hover:opacity-70"
                        }`}
                        style={{ background: meta.bg, color: meta.text }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Debt */}
              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <h3 className="text-sm text-[#666] mb-3">{t("admin.suppliers.debt")}</h3>
                <div className="flex items-center gap-3">
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.suppliers.totalDebt")}</p>
                    <p className="text-sm font-bold text-[#22C55E]">{selected.totalDebt ? `₫${selected.totalDebt.toLocaleString()}` : "—"}</p>
                  </div>
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.suppliers.overdueDebt")}</p>
                    <p className="text-sm font-bold text-[#B54843]">{selected.overdueDebt ? `₫${selected.overdueDebt.toLocaleString()}` : "—"}</p>
                  </div>
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.suppliers.monthDebt")}</p>
                    <p className="text-sm font-bold text-[#D97706]">{selected.monthDebt ? `₫${selected.monthDebt.toLocaleString()}` : "—"}</p>
                  </div>
                </div>
              </div>

              {/* General */}
              <div className="px-6 py-5 border-b-[3px] border-[#222] space-y-4">
                <h3 className="text-sm text-[#666] mb-3">{t("admin.suppliers.general")}</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.suppliers.partnerSince")}</p>
                    <p className="text-sm font-bold">{timeSince(selected.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.name")}</div>
                  <input className={input} value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.contact")}</div>
                  <input className={input} value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.email")}</div>
                  <input className={input} value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>

              {/* Bank */}
              <div className="px-6 py-5 space-y-4">
                <h3 className="text-sm text-[#666] mb-3">{t("admin.suppliers.bank")}</h3>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.bankName")}</div>
                  <input className={input} value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.bankAccountName")}</div>
                  <input className={input} value={form.bankAccountName}
                    onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} />
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.bankAccountNumber")}</div>
                  <input className={input} value={form.bankAccountNumber}
                    onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
              <button onClick={handleSave} className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 py-3`}>
                <Save size={16} /> {t("common.save")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
