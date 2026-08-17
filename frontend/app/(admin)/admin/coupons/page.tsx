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
import { useToast } from "@/components/toast";
import { SkeletonTable } from "@/components/skeleton";
import { X, Save, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

interface Coupon {
  id: number;
  code: string;
  scope: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  maxUsageCount: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const colWidths = ["1.25fr", "1fr", "100px", "100px", "100px", "100px", "80px", "100px"];
const gridCols = colWidths.join(" ");

const SCOPE_OPTIONS = ["ORDER", "ITEM"] as const;
const TYPE_OPTIONS = ["percentage", "fixed"] as const;
const COUPON_STATUS = ["active", "inactive"] as const;

function defaultForm() {
  return {
    code: "", scope: "ORDER" as string, discountType: "percentage" as string, discountValue: 0,
    minOrderAmount: 0, maxDiscountAmount: 0, maxUsageCount: 0, isActive: true, expiresAt: "",
  };
}

export default function AdminCouponsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm());

  const fetchCoupons = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Coupon[]>("/api/admin/coupons", token);
      setCoupons(data ?? []);
    } catch { showToast(t("admin.coupons.fetchFailed"), "error"); }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchCoupons().finally(() => setLoading(false));
  }, [token]);

  const filtered = coupons.filter((c) => {
    const q = search.toLowerCase();
    return (!q || c.code.toLowerCase().includes(q)) &&
      (filter === "all" || (filter === "active" ? c.isActive : !c.isActive));
  });

  const openDetail = (c: Coupon) => {
    setSelected(c);
    setForm({
      code: c.code, scope: c.scope, discountType: c.discountType, discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount, maxDiscountAmount: c.maxDiscountAmount ?? 0,
      maxUsageCount: c.maxUsageCount, isActive: c.isActive, expiresAt: c.expiresAt?.slice(0, 10) ?? "",
    });
  };

  const openCreate = () => {
    setSelected({ id: 0 } as any);
    setForm(defaultForm());
  };

  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/coupons", token, {
        method: "POST",
        body: JSON.stringify(form),
      });
      showToast(t("admin.coupons.created"), "success");
      setSelected(null);
      await fetchCoupons();
    } catch (e: any) { showToast(e.message || t("admin.coupons.createFailed"), "error"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await apiFetch(`/api/admin/coupons/${id}`, token, { method: "DELETE" });
      setCoupons((s) => s.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast(t("admin.coupons.deleted"), "success");
    } catch { showToast(t("admin.coupons.deleteFailed"), "error"); }
  };

  const sidebarOpen = selected !== null;
  const isCreating = selected?.id === 0;

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.coupons.label")} title={t("admin.coupons.title")}>
        <div className="flex items-center gap-3">
          <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.coupons.searchPlaceholder")} />
          <button suppressHydrationWarning onClick={openCreate}
            className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}>
            {t("admin.coupons.createBtn")}
          </button>
        </div>
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 max-[1440px]:py-4 max-[1280px]:py-3 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: t("admin.filterTabs.all") },
            { key: "active", label: t("admin.coupons.active") },
            { key: "inactive", label: t("admin.coupons.inactive") },
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
                {[t("admin.coupons.code"), t("admin.coupons.scope.label"), t("admin.coupons.value"), t("admin.coupons.used"), t("admin.coupons.minOrder"), t("admin.coupons.expiresAt"), t("admin.coupons.status"), t("common.action")].map((h) => (
                  <div key={h} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</div>
                ))}
              </div>
            }
            gridCols={gridCols}
          >
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-10"><p className="text-lg font-bold">{t("admin.coupons.empty")}</p></div>
            ) : (
              filtered.map((c) => (
                <div key={c.id} onClick={() => openDetail(c)}
                  className="grid hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10 items-center py-3 cursor-pointer"
                  style={{ gridTemplateColumns: gridCols }}>
                  <div className="px-2 text-sm font-bold font-mono whitespace-nowrap">{c.code}</div>
                  <div className="px-2 whitespace-nowrap">
                    <span className={`font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${c.scope === "ORDER" ? "bg-[#FFD93D] text-[#222]" : "bg-[#22C55E] text-white"}`}>
                      {t(`admin.coupons.scope.${c.scope.toLowerCase()}`)}
                    </span>
                  </div>
                  <div className="px-2 text-sm font-bold whitespace-nowrap">
                    {c.discountType === "percentage" ? `${c.discountValue}%` : `₫${c.discountValue.toLocaleString()}`}
                  </div>
                  <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">{c.usedCount}/{c.maxUsageCount || "∞"}</div>
                  <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">₫{c.minOrderAmount.toLocaleString()}</div>
                  <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">{c.expiresAt ? c.expiresAt.slice(0, 10) : "∞"}</div>
                  <div className="px-2 whitespace-nowrap"><StatusBadge status={c.isActive ? "active" : "default"} label={c.isActive ? t("admin.coupons.active") : t("admin.coupons.inactive")} /></div>
                  <div className="px-2 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className={`${neoBtn} p-1.5 text-[#B54843]`}>
                      <Trash2 size={14} />
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
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" />
          <div className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]" style={{ width: 420 }}>
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div>
                <p className={`${label} mb-1 text-[#666]`}>{t("admin.coupons.detailLabel")}</p>
                <h2 className="text-xl font-bold truncate max-w-[300px]">{isCreating ? t("admin.coupons.createTitle") : selected!.code}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222] hover:translate-x-px hover:translate-y-[1px] transition-[transform,background-color]"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-4">
              {/* Status */}
              <div>
                <h3 className="text-sm text-[#666] mb-3">{t("admin.coupons.status")}</h3>
                <div className="flex gap-2">
                  {COUPON_STATUS.map((s) => {
                    const active = (s === "active") === form.isActive;
                    const meta = s === "active" ? { bg: "#D4EDDA", text: "#155724" } : { bg: "#F8D7DA", text: "#721C24" };
                    return (
                      <button key={s} onClick={() => setForm({ ...form, isActive: s === "active" })} disabled={!isCreating}
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none rounded-[6px] px-2.5 py-1.5 border-2 transition-[opacity,border-color] disabled:opacity-60 ${
                          active ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100" : "border-transparent opacity-40 hover:opacity-70"
                        }`}
                        style={{ background: meta.bg, color: meta.text }}>
                        {s === "active" ? t("admin.coupons.active") : t("admin.coupons.inactive")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.code")}</div>
                <input className={input} value={form.code} disabled={!isCreating}
                  onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SUMMER50" />
              </div>
              <div>
                <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.scope.label")}</div>
                <div className="flex gap-2">
                  {SCOPE_OPTIONS.map((s) => (
                    <button key={s} onClick={() => setForm({ ...form, scope: s })} disabled={!isCreating}
                      className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${form.scope === s ? neoBtnPrimary : neoBtn}`}>
                      {t(`admin.coupons.scope.${s.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.type")}</div>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((t) => (
                    <button key={t} onClick={() => setForm((f) => ({ ...f, discountType: t }))} disabled={!isCreating}
                      className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${form.discountType === t ? neoBtnPrimary : neoBtn}`}>
                      {t === "percentage" ? "%" : "₫"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.value")}</div>
                  <input type="number" value={form.discountValue} disabled={!isCreating} onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))} className={input} min={0} />
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.maxDiscount")}</div>
                  <input type="number" value={form.maxDiscountAmount} disabled={!isCreating} onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: Number(e.target.value) }))} className={input} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.minOrder")}</div>
                  <input type="number" value={form.minOrderAmount} disabled={!isCreating} onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))} className={input} min={0} />
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.maxUsage")}</div>
                  <input type="number" value={form.maxUsageCount} disabled={!isCreating} onChange={(e) => setForm((f) => ({ ...f, maxUsageCount: Number(e.target.value) }))} className={input} min={0} placeholder="0 = ∞" />
                </div>
              </div>
              <div>
                <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.expiresAt")}</div>
                <input type="date" value={form.expiresAt} disabled={!isCreating} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className={input} />
              </div>
            </div>

            {isCreating && (
            <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
              <button onClick={handleSave} disabled={saving || !form.code.trim()} className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40`}>
                <Save size={16} /> {saving ? `${t("common.save")}…` : t("common.save")}
              </button>
            </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
