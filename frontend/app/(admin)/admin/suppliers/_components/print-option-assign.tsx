"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { label, card, neoBtn, neoBtnPrimary, input } from "@/lib/styles";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import { PrintOption, PRINT_OPTION_TYPES } from "@/models/print-option/print-option";
import { SupplierOption, SupplierDTO, L10NText } from "@echotrace/shared";
import { CloseButton } from "@/components/ui/close-button";
import { Save, Plus, Trash2, Search } from "lucide-react";

interface Props {
  supplierId: number;
  assigned: { paperSizeOptions: SupplierOption[]; paperOptions: SupplierOption[]; coverOptions: SupplierOption[] };
  onChanged: (data: { paperSizeOptions: SupplierOption[]; paperOptions: SupplierOption[]; coverOptions: SupplierOption[] }) => void;
}

export function PrintOptionAssign({ supplierId, assigned, onChanged }: Props) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [catalog, setCatalog] = useState<PrintOption[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const lng = ((i18n.resolvedLanguage || i18n.language || "vi").split("-")[0] as keyof L10NText) || "vi";

  const assignedCodes = useMemo(() => {
    const set = new Set<string>();
    (assigned.paperSizeOptions ?? []).forEach((o) => set.add(o.code));
    (assigned.paperOptions ?? []).forEach((o) => set.add(o.code));
    (assigned.coverOptions ?? []).forEach((o) => set.add(o.code));
    return set;
  }, [assigned]);

  const fetchCatalog = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ items: PrintOption[] }>("/api/admin/print-options", token);
      setCatalog(data.items ?? []);
    } catch {
      showToast(t("admin.printOptions.fetchFailed"), "error");
    }
  };

  useEffect(() => {
    if (token) fetchCatalog();
  }, [token]);

  const openModal = () => {
    setOpen(true);
    const pre = catalog.filter((o) => assignedCodes.has(o.code)).map((o) => o.id);
    setSelected(new Set(pre));
    setQ("");
  };

  const saveAssignments = async (ids: Set<number>) => {
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/suppliers/${supplierId}/options`, token, {
        method: "PATCH",
        body: JSON.stringify({ optionIds: [...ids] }),
      });
      const fresh = await apiFetch<SupplierDTO>(`/api/admin/suppliers/${supplierId}`, token);
      onChanged({
        paperSizeOptions: fresh.paperSizeOptions ?? [],
        paperOptions: fresh.paperOptions ?? [],
        coverOptions: fresh.coverOptions ?? [],
      });
      showToast(t("admin.suppliers.assignSuccess"), "success");
    } catch (e: any) {
      showToast(e.message || t("admin.suppliers.assignFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (code: string) => {
    const ids = catalog.filter((o) => o.code !== code && assignedCodes.has(o.code)).map((o) => o.id);
    await saveAssignments(new Set(ids));
  };

  const nameOf = (o: SupplierOption | PrintOption) =>
    o.name?.[lng] || o.name?.vi || o.name?.en || o.name?.es || o.code;

  const groups = PRINT_OPTION_TYPES.map((type) => ({
    type,
    items: catalog.filter((o) => o.type === type),
  })).filter((g) => g.items.length > 0);

  const rows = assigned.paperSizeOptions
    .map((o) => ({ type: "paperSize", option: o }))
    .concat(assigned.paperOptions.map((o) => ({ type: "paper", option: o })))
    .concat(assigned.coverOptions.map((o) => ({ type: "cover", option: o })));

  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm text-[#666] font-bold">{t("admin.suppliers.printOptions")}</h3>
          <p className="text-[10px] text-[#999] font-mono mt-0.5">{t("admin.suppliers.printOptionsHint")}</p>
        </div>
        <button onClick={openModal} className={`${neoBtn} flex items-center gap-1 cursor-pointer px-3 py-2`}>
          <Plus size={13} />{" "}
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
            {t("admin.suppliers.assignOptions")}
          </span>
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-[#888] font-mono">{t("common.noData")}</p>
      ) : (
        <div className="space-y-1">
          {rows.map(({ type, option }) => (
            <div
              key={`${type}-${option.code}`}
              className="flex items-center justify-between gap-2 border-b last:border-b-0 border-[#222]/10 py-1.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold font-mono">
                  {option.code}{" "}
                  <span className="text-[10px] text-[#999] font-mono normal-case">
                    {t(`admin.printOptions.types.${type}`)}
                  </span>
                </p>
                <p className="text-[11px] text-[#666] truncate">
                  {nameOf(option)}
                  {option.price != null ? ` — ₫${option.price.toLocaleString()}` : ""}
                </p>
                {option.description?.[lng]?.trim() && (
                  <p className="text-[11px] text-[#999] truncate">{option.description[lng] ?? option.description.vi ?? option.description.en}</p>
                )}
              </div>
              <button
                onClick={() => remove(option.code)}
                className="p-1.5 text-[#B02A2A] hover:text-[#7A1C1C] cursor-pointer shrink-0"
                title={t("common.delete")}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center">
          <div
            className="bg-[#F8F2E5] rounded-[10px] border-[3px] border-[#222] shadow-[6px_6px_0_#222] w-[520px] max-w-[92vw] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b-[3px] border-[#222]">
              <h3 className="text-[15px] font-extrabold uppercase tracking-wide">
                {t("admin.suppliers.assignOptionsTitle")}
              </h3>
              <CloseButton onClick={() => setOpen(false)} />
            </div>

            <div className="px-5 py-3 border-b-2 border-[#222]/10">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  className={`${input} pl-8`}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("admin.printOptions.searchPlaceholder")}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {groups.length === 0 && <p className="text-xs text-[#888] font-mono">{t("common.noData")}</p>}
              {groups.map(({ type, items }) => {
                const visible = items.filter((o) => !q || o.code.toLowerCase().includes(q.toLowerCase()));
                if (!visible.length) return null;
                return (
                  <div key={type}>
                    <p className={`${label} text-xs text-[#666] mb-2`}>
                      {t(`admin.printOptions.types.${type}`)}
                    </p>
                    <div className="space-y-1">
                      {visible.map((o) => {
                        const checked = selected.has(o.id);
                        return (
                          <label
                            key={o.id}
                            className="flex items-center gap-3 px-2 py-1.5 rounded-[6px] border-2 border-[#222]/20 hover:border-[#222] cursor-pointer bg-white/60"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelected((s) => {
                                  const next = new Set(s);
                                  if (checked) next.delete(o.id);
                                  else next.add(o.id);
                                  return next;
                                })
                              }
                              className="accent-[#222] w-4 h-4 shrink-0"
                            />
                            <span className="text-xs font-bold font-mono">{o.code}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] text-[#666] truncate block">{nameOf(o)}</span>
                              {o.description?.[lng]?.trim() && (
                                <span className="text-[10px] text-[#999] truncate block">{o.description[lng] ?? o.description.vi ?? o.description.en}</span>
                              )}
                            </div>
                            {o.price != null && (
                              <span className="text-[10px] font-mono text-[#666] shrink-0">
                                ₫{o.price.toLocaleString()}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t-[3px] border-[#222]">
              <span className="font-mono text-[10px] font-bold text-[#666]">
                {t("admin.suppliers.selectedCount", { count: selected.size })}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className={`${neoBtn} px-4 py-2`}>
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => {
                    saveAssignments(selected).then(() => setOpen(false));
                  }}
                  disabled={saving}
                  className={`${neoBtnPrimary} flex items-center gap-2 px-4 py-2 disabled:opacity-40`}
                >
                  <Save size={14} /> {saving ? `${t("common.save")}…` : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}