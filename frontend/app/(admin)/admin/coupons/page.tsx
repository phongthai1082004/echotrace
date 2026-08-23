"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { label, card, neoBtn, neoBtnPrimary, neoBtnDanger, input } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { AdminList } from "@/components/admin-list";
import { YesNoPopup } from "@/components/yes-no-popup";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import { useDebounce } from "@hooks";
import { DiscountType, MinOrderType } from "@echotrace/shared";
import { Save, Trash2 } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { StatusBadge } from "@/components/status-badge";

interface Coupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  minOrderType: string;
  maxDiscountAmount: number | null;
  maxUsageCount: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const TYPE_OPTIONS = [DiscountType.PERCENTAGE, DiscountType.FIXED] as const;
const MIN_ORDER_OPTIONS = [MinOrderType.VALUE, MinOrderType.QUANTITY] as const;

interface CouponForm {
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  minOrderType: string;
  maxDiscountAmount: number;
  maxUsageCount: number;
  isActive: boolean;
  expiresAt: string;
}

function defaultForm(): CouponForm {
  return {
    code: "",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 0,
    minOrderAmount: 0,
    minOrderType: MinOrderType.VALUE,
    maxDiscountAmount: 0,
    maxUsageCount: 0,
    isActive: true,
    expiresAt: "",
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
  const debouncedSearch = useDebounce(search, 1000);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeact, setConfirmDeact] = useState(false);
  const [form, setForm] = useState(defaultForm());

  const fetchCoupons = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Coupon[]>("/api/admin/coupons", token);
      setCoupons(data ?? []);
    } catch {
      showToast(t("admin.coupons.fetchFailed"), "error");
    }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchCoupons().finally(() => setLoading(false));
  }, [token]);

  const filtered = coupons.filter((c) => {
    const q = debouncedSearch.toLowerCase();
    return (
      (!q || c.code.toLowerCase().includes(q)) && (filter === "all" || (filter === "active" ? c.isActive : !c.isActive))
    );
  });

  const openDetail = (c: Coupon) => {
    setSelected(c);
    setForm({
      code: c.code,
      discountType: c.discountType?.toLowerCase(),
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount,
      minOrderType: c.minOrderType?.toLowerCase(),
      maxDiscountAmount: c.maxDiscountAmount ?? 0,
      maxUsageCount: c.maxUsageCount,
      isActive: c.isActive,
      expiresAt: c.expiresAt?.slice(0, 10) ?? "",
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
    } catch (e: any) {
      showToast(e.message || t("admin.coupons.createFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!token || !selected) return;
    try {
      await apiFetch(`/api/admin/coupons/${selected.id}/deactivate`, token, { method: "PATCH" });
      setCoupons((s) => s.map((c) => (c.id === selected.id ? { ...c, isActive: false } : c)));
      setSelected((cur) => (cur ? { ...cur, isActive: false } : cur));
      setForm((f) => ({ ...f, isActive: false }));
      setConfirmDeact(false);
      showToast(t("admin.coupons.deactivated"), "success");
    } catch {
      showToast(t("admin.coupons.deactivateFailed"), "error");
      setConfirmDeact(false);
    }
  };

  const sidebarOpen = selected !== null;
  const isCreating = selected?.id === 0;

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.coupons.label")} title={t("admin.coupons.title")}>
        <div className="flex items-center gap-3">
          <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.coupons.searchPlaceholder")} />
          <button
            suppressHydrationWarning
            onClick={openCreate}
            className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}
          >
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
          <AdminList
            columns={[
              { key: "code", label: t("admin.coupons.code"), width: "1fr" },
              { key: "value", label: t("admin.coupons.value"), width: "90px" },
              { key: "used", label: t("admin.coupons.used"), width: "90px" },
              { key: "minOrder", label: t("admin.coupons.minOrder"), width: "90px" },
              { key: "expiresAt", label: t("admin.coupons.expiresAt"), width: "110px" },
              { key: "status", label: t("admin.coupons.status"), width: "90px", align: "center" },
            ]}
            data={filtered}
            loading={loading}
            rowKey={(c) => c.id}
            onRowClick={openDetail}
            empty={
              <div className="flex items-center justify-center py-10">
                <p className="text-lg font-bold">{t("admin.coupons.empty")}</p>
              </div>
            }
            renderRow={(c) => (
              <>
                <div className="px-2 text-sm font-bold font-mono whitespace-nowrap">{c.code}</div>
                <div className="px-2 text-sm font-bold whitespace-nowrap">
                  {c.discountType?.toLowerCase() === DiscountType.PERCENTAGE
                    ? `${c.discountValue}%`
                    : `₫${c.discountValue.toLocaleString()}`}
                </div>
                <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">
                  {c.usedCount}/{c.maxUsageCount || "∞"}
                </div>
                <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">
                  {c.minOrderType?.toLowerCase() === MinOrderType.QUANTITY ? "×" : "₫"}
                  {c.minOrderAmount.toLocaleString()}
                </div>
                <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">
                  {c.expiresAt ? c.expiresAt.slice(0, 10) : "∞"}
                </div>
                <div className="px-2 flex justify-center whitespace-nowrap">
                  <StatusBadge
                    status={c.isActive ? "active" : "default"}
                    label={c.isActive ? t("admin.coupons.active") : t("admin.coupons.inactive")}
                  />
                </div>
              </>
            )}
          />
        </div>
      </div>

      {/* ── DETAIL SIDEBAR ── */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" />
          <div
            className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]"
            style={{ width: 420 }}
          >
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div>
                <p className={`${label} mb-1 text-[#666]`}>{t("admin.coupons.detailLabel")}</p>
                <h2 className="text-xl font-bold truncate max-w-[300px]">
                  {isCreating ? t("admin.coupons.createTitle") : selected!.code}
                </h2>
              </div>
              <CloseButton onClick={() => setSelected(null)} />
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-4">
              {/* Status — chỉ hiện khi đã tạo, không sửa trực tiếp */}
              {!isCreating && (
                <div>
                  <h3 className="text-sm text-[#666] mb-3">{t("admin.coupons.status")}</h3>
                  <StatusBadge
                    status={form.isActive ? "active" : "default"}
                    label={form.isActive ? t("admin.coupons.active") : t("admin.coupons.inactive")}
                  />
                </div>
              )}

              <div>
                <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.code")}</div>
                <input
                  className={input}
                  value={form.code}
                  disabled={!isCreating}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="SUMMER50"
                />
                <p className="text-[10px] text-[#999] mt-1">{t("admin.coupons.codeHint")}</p>
              </div>
              <div>
                <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.type")}</div>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          discountType: t,
                          maxDiscountAmount: t === DiscountType.FIXED ? 0 : f.maxDiscountAmount,
                        }))
                      }
                      disabled={!isCreating}
                      className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${form.discountType === t ? neoBtnPrimary : neoBtn}`}
                    >
                      {t === DiscountType.PERCENTAGE ? "%" : "₫"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.value")}</div>
                  <input
                    type="number"
                    value={form.discountValue}
                    disabled={!isCreating}
                    onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
                    className={input}
                    min={0}
                  />
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.maxDiscount")}</div>
                  <input
                    type="number"
                    value={form.maxDiscountAmount}
                    disabled={!isCreating || form.discountType === "fixed"}
                    onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: Number(e.target.value) }))}
                    className={`${input} disabled:opacity-40`}
                    min={0}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.minOrder")}</div>
                  <div className="flex gap-2 mb-2">
                    {MIN_ORDER_OPTIONS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setForm((f) => ({ ...f, minOrderType: m }))}
                        disabled={!isCreating}
                        className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1.5 text-[10px] ${form.minOrderType === m ? neoBtnPrimary : neoBtn}`}
                      >
                        {t(`admin.coupons.minOrderUnit.${m}`)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={form.minOrderAmount}
                    disabled={!isCreating}
                    onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))}
                    className={input}
                    min={0}
                  />
                </div>
                <div>
                  <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.maxUsage")}</div>
                  <input
                    type="number"
                    value={form.maxUsageCount}
                    disabled={!isCreating}
                    onChange={(e) => setForm((f) => ({ ...f, maxUsageCount: Number(e.target.value) }))}
                    className={input}
                    min={0}
                    placeholder="0 = ∞"
                  />
                </div>
              </div>
              <div>
                <div className={`${label} text-xs text-[#666] mb-1`}>{t("admin.coupons.expiresAt")}</div>
                <input
                  type="date"
                  value={form.expiresAt}
                  disabled={!isCreating}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className={input}
                />
              </div>
            </div>

            {isCreating ? (
              <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.code.trim()}
                  className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40`}
                >
                  <Save size={16} /> {saving ? `${t("common.save")}…` : t("common.save")}
                </button>
              </div>
            ) : (
              form.isActive && (
                <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
                  <button
                    onClick={() => setConfirmDeact(true)}
                    className={`${neoBtnDanger} w-full flex items-center justify-center gap-2 py-3`}
                  >
                    <Trash2 size={16} /> {t("admin.coupons.deactivate")}
                  </button>
                </div>
              )
            )}
          </div>
        </>
      )}

      <YesNoPopup
        open={confirmDeact}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeact(false)}
        title={t("admin.coupons.deactivateConfirmTitle")}
        message={t("admin.coupons.deactivateConfirmText")}
        confirmLabel={t("admin.coupons.deactivate")}
      />
    </div>
  );
}
