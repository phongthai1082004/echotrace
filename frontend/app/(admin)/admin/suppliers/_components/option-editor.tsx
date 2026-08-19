"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { label, input, neoBtn, neoBtnPrimary, card } from "@/lib/styles";
import { SupplierOption, L10NText } from "@/models/supplier/supplier";
import { Pencil, X, Save, Plus, Trash2, ChevronDown } from "lucide-react";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api.fetch";

const LANGS = ["vi", "en", "es"] as const;

function emptyOption(): SupplierOption {
  return {
    code: "",
    name: { vi: "", en: "", es: "" },
    description: { vi: "", en: "", es: "" },
    price: null,
  };
}

function OptionModal({
  initial,
  onCancel,
  onSave,
  add,
  withDimensions,
  optionType,
}: {
  initial: SupplierOption;
  onCancel: () => void;
  onSave: (o: SupplierOption) => void;
  add: boolean;
  withDimensions?: boolean;
  optionType: string;
}) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const lng = (i18n.language?.split("-")[0] as keyof L10NText) || "vi";
  const [draft, setDraft] = useState<SupplierOption>(initial);
  const [catalog, setCatalog] = useState<SupplierOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const setLang = (key: "name" | "description", lng: keyof L10NText, v: string) =>
    setDraft({ ...draft, [key]: { ...draft[key], [lng]: v } });
  const num = (v: number | null | undefined) => (v == null ? "" : String(v));
  const setNum = (key: "width" | "height", v: string) => {
    const n = v.trim() === "" ? null : Number(v);
    setDraft({ ...draft, [key]: Number.isNaN(n) ? null : n });
  };
  const setPrice = (v: string) => {
    const n = v.trim() === "" ? null : Number(v);
    setDraft({ ...draft, price: Number.isNaN(n) ? null : n });
  };

  const openPicker = async () => {
    setPickerOpen((open) => !open);
    // ponytail: refetch every open so the list reflects recent add/update (no component-level staleness).
    try {
      const data = await apiFetch<{ items: SupplierOption[] }>(
        `/api/admin/supplier-options/catalog?type=${optionType}`,
        token,
      );
      setCatalog(data.items ?? []);
    } catch {
      /* picker stays usable with current draft */
    }
  };

  const pick = async (code: string) => {
    setPickerOpen(false);
    try {
      const info = await apiFetch<SupplierOption>(
        `/api/admin/supplier-options/info?type=${optionType}&code=${encodeURIComponent(code)}`,
        token,
      );
      setDraft((d) => ({
        ...d,
        code,
        name: info.name,
        description: info.description,
        price: info.price ?? d.price,
      }));
    } catch {
      showToast(t("admin.suppliers.fetchFailed"), "error");
    }
  };

  const save = () => {
    if (!draft.code.trim()) {
      showToast(t("admin.suppliers.optionCode") + "…", "error");
      return;
    }
    onSave(draft);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center">
      <div
        className="bg-[#F8F2E5] rounded-[10px] border-[3px] border-[#222] shadow-[6px_6px_0_#222] w-[480px] max-w-[92vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b-[3px] border-[#222] bg-[#F8F2E5] rounded-t-[10px]">
          <h3 className="text-[15px] font-extrabold uppercase tracking-wide">
            {t(add ? "admin.suppliers.addOption" : "admin.suppliers.editOption")}
          </h3>
          <button onClick={onCancel} className="cursor-pointer text-[#666] hover:text-[#222]">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          <div>
            <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.optionCode")}</p>
            <div className="relative">
              <input
                className={input}
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder={t("admin.suppliers.optionCodePlaceholder")}
                disabled={!add}
                readOnly={!add}
                style={!add ? { backgroundColor: "#EAE5DA", color: "#888" } : undefined}
              />
              {add && (
                <>
                  <button
                    onClick={openPicker}
                    title={t("admin.suppliers.pickExisting")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#222] cursor-pointer"
                  >
                    <ChevronDown size={16} />
                  </button>
                  {pickerOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                      <div className="absolute z-50 right-0 mt-1 w-full bg-white border-2 border-[#222] rounded-[8px] shadow-[3px_3px_0_rgba(0,0,0,0.25)] max-h-48 overflow-y-auto">
                        {catalog.length === 0 && <p className="px-3 py-2 text-xs text-[#888]">{t("common.noData")}</p>}
                        {catalog.map((o) => (
                          <button
                            key={o.code}
                            onClick={() => pick(o.code)}
                            className="block w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#F8F2E5] cursor-pointer border-b last:border-b-0 border-[#222]/10"
                          >
                            {o.code}
                            {o.name?.[lng] ? ` — ${o.name[lng]}` : o.name?.vi ? ` — ${o.name.vi}` : ""}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <p className={`${label} text-xs text-[#666] mb-2`}>{t("admin.suppliers.optionName")}</p>
            <div className="space-y-2">
              {LANGS.map((lng) => (
                <input
                  key={lng}
                  className={input}
                  value={draft.name[lng]}
                  onChange={(e) => setLang("name", lng, e.target.value)}
                  placeholder={`${lng.toUpperCase()} — ${t("admin.suppliers.optionName")}`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className={`${label} text-xs text-[#666] mb-2`}>{t("admin.suppliers.optionDescription")}</p>
            <div className="space-y-2">
              {LANGS.map((lng) => (
                <input
                  key={lng}
                  className={input}
                  value={draft.description[lng]}
                  onChange={(e) => setLang("description", lng, e.target.value)}
                  placeholder={`${lng.toUpperCase()} — ${t("admin.suppliers.optionDescription")}`}
                />
              ))}
            </div>
          </div>

          {withDimensions && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.optionWidth")}</p>
                <input className={input} value={num(draft.width)} onChange={(e) => setNum("width", e.target.value)} />
              </div>
              <div>
                <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.optionHeight")}</p>
                <input className={input} value={num(draft.height)} onChange={(e) => setNum("height", e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.suppliers.optionPrice")}</p>
            <input className={input} value={num(draft.price)} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onCancel} className={`${neoBtn} px-4 py-2`}>
              {t("common.cancel")}
            </button>
            <button onClick={save} className={`${neoBtnPrimary} px-4 py-2`}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PanelProps {
  title: string;
  options: SupplierOption[];
  onChange: (v: SupplierOption[]) => void;
  onSave: () => void;
  saving?: boolean;
  withDimensions?: boolean;
  optionType: string;
}

function OptionPanel({ title, options, onChange, onSave, saving, withDimensions, optionType }: PanelProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [modal, setModal] = useState<{ option: SupplierOption; add: boolean; index?: number } | null>(null);

  const handleModalSave = (o: SupplierOption) => {
    if (modal?.add) {
      if (options.some((x) => x.code === o.code)) {
        showToast(t("admin.suppliers.optionDuplicate"), "error");
        return;
      }
      onChange([...options, o]);
    } else if (modal?.index != null) {
      const next = [...options];
      next[modal.index] = o;
      onChange(next);
    }
    setModal(null);
  };

  const remove = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
    showToast(t("admin.suppliers.optionRemoved"), "success");
  };

  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-[#666] font-bold">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal({ option: emptyOption(), add: true })}
            className={`${neoBtn} flex items-center gap-1 cursor-pointer px-3 py-2`}
          >
            <Plus size={13} />{" "}
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
              {t("admin.suppliers.addOption")}
            </span>
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className={`${neoBtnPrimary} flex items-center gap-1 cursor-pointer disabled:opacity-40 px-3 py-2`}
          >
            <Save size={13} />{" "}
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
              {saving ? `${t("common.save")}…` : t("common.save")}
            </span>
          </button>
        </div>
      </div>

      {options.length === 0 ? (
        <p className="text-xs text-[#888] font-mono">{t("common.noData")}</p>
      ) : (
        <div className="space-y-1">
          {options.map((o, i) => {
            const lng = (i18n.language?.split("-")[0] as keyof L10NText) || "vi";
            const name = o.name?.[lng] || o.name?.vi || o.name?.en || o.name?.es || o.code;
            const desc = o.description?.[lng] || o.description?.vi || "";
            return (
              <div
                key={`${o.code}-${i}`}
                className="flex items-center justify-between gap-2 border-b last:border-b-0 border-[#222]/10 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold font-mono">{o.code}</p>
                  <p className="text-[11px] text-[#666] truncate">
                    {name}
                    {desc ? ` — ${desc}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setModal({ option: { ...o }, add: false, index: i })}
                    className="p-1.5 text-[#666] hover:text-[#222] cursor-pointer"
                    title={t("common.edit")}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => remove(i)}
                    className="p-1.5 text-[#B02A2A] hover:text-[#7A1C1C] cursor-pointer"
                    title={t("common.delete")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <OptionModal
          initial={modal.option}
          add={modal.add}
          withDimensions={withDimensions}
          optionType={optionType}
          onCancel={() => setModal(null)}
          onSave={handleModalSave}
        />
      )}
    </section>
  );
}

export { OptionPanel };
