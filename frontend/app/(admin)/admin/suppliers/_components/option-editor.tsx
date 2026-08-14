"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { label, input, neoBtn, neoBtnPrimary, card } from "@/lib/styles";
import { SupplierOption, L10NText } from "@/models/supplier/supplier";
import { Pencil, X, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";

const LANGS = ["vi", "en", "es"] as const;

function emptyOption(): SupplierOption {
  return {
    code: "",
    name: { vi: "", en: "", es: "" },
    description: { vi: "", en: "", es: "" },
  };
}

function OptionModal({ initial, onCancel, onSave, add, withDimensions }: {
  initial: SupplierOption;
  onCancel: () => void;
  onSave: (o: SupplierOption) => void;
  add: boolean;
  withDimensions?: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<SupplierOption>(initial);
  const setLang = (key: "name" | "description", lng: keyof L10NText, v: string) =>
    setDraft({ ...draft, [key]: { ...draft[key], [lng]: v } });
  const num = (v: number | null | undefined) => (v == null ? "" : String(v));
  const setNum = (key: "width" | "height", v: string) => {
    const n = v.trim() === "" ? null : Number(v);
    setDraft({ ...draft, [key]: Number.isNaN(n) ? null : n });
  };
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-[#F8F2E5] rounded-[10px] border-[3px] border-[#222] shadow-[6px_6px_0_#222] w-[480px] max-w-[92vw] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-[#222] shrink-0">
          <h3 className="text-lg font-bold">{add ? t("admin.suppliers.addOption") : t("admin.suppliers.optionTitle")}</h3>
          <button onClick={onCancel} className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222] cursor-pointer"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div>
            <p className={`${label} text-xs text-[#666] mb-1`}>Code</p>
            <input className={input} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </div>
          {withDimensions && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-0.5">
                <span className={`${label} text-[#999]`}>width (mm)</span>
                <input className={input} inputMode="numeric" value={num(draft.width)} onChange={(e) => setNum("width", e.target.value)} />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className={`${label} text-[#999]`}>height (mm)</span>
                <input className={input} inputMode="numeric" value={num(draft.height)} onChange={(e) => setNum("height", e.target.value)} />
              </label>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((lng) => (
              <label key={lng} className="flex flex-col gap-0.5">
                <span className={`${label} text-[#999]`}>name {lng}</span>
                <input className={input} value={draft.name[lng]} onChange={(e) => setLang("name", lng, e.target.value)} />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((lng) => (
              <label key={lng} className="flex flex-col gap-0.5">
                <span className={`${label} text-[#999]`}>desc {lng}</span>
                <input className={input} value={draft.description[lng]} onChange={(e) => setLang("description", lng, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t-[3px] border-[#222] flex gap-3 shrink-0">
          <button onClick={onCancel} className={`${neoBtn} flex-1 font-mono text-[9px] font-bold tracking-widest uppercase py-2.5 cursor-pointer`}>
            {t("common.cancel")}
          </button>
          <button onClick={() => onSave(draft)}
            className={`${neoBtnPrimary} flex-1 flex items-center justify-center gap-2 font-mono text-[9px] font-bold tracking-widest uppercase py-2.5 cursor-pointer`}>
            <Save size={14} /> {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OptionPanel({ title, options, onChange, onSave, saving = false, withDimensions = false }: {
  title: string;
  options: SupplierOption[];
  onChange: (o: SupplierOption[]) => void;
  onSave?: () => void;
  saving?: boolean;
  withDimensions?: boolean;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<{ index: number; item: SupplierOption } | null>(null);
  const openEdit = (i: number) => setEditing({ index: i, item: options[i] });
  const openAdd = () => setEditing({ index: -1, item: emptyOption() });
  const save = (item: SupplierOption) => {
    if (editing && editing.index === -1) {
      if (options.some((o) => o.code === item.code)) {
        showToast(t("admin.suppliers.optionDuplicate") || "Code đã tồn tại", "error");
        return;
      }
      onChange([...options, item]);
    } else if (editing && editing.index !== -1) {
      onChange(options.map((o, i) => (i === editing.index ? item : o)));
    }
    setEditing(null);
  };
  const remove = (i: number) => {
    onChange(options.filter((_, idx) => idx !== i));
  };
  const head = (s: string) => <div key={s} className={`px-2 py-2 ${label} text-[#666] border-b-[3px] border-[#222] whitespace-nowrap text-left`}>{s}</div>;
  const cols = "90px repeat(3, 1fr) repeat(3, 1fr) 140px";
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm text-[#666] font-bold">{title}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openAdd}
            className={`${neoBtn} flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 cursor-pointer`}>
            <Plus size={12} /> {t("admin.suppliers.addOption")}
          </button>
          {onSave && (
            <button onClick={onSave} disabled={saving}
              className={`${neoBtnPrimary} flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 cursor-pointer disabled:opacity-40`}>
              <Save size={12} /> {saving ? "…" : "Save"}
            </button>
          )}
        </div>
      </div>
      {options.length === 0 ? (
        <p className="text-xs text-[#999]">—</p>
      ) : (
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <div style={{ minWidth: 760 }}>
            <div className="grid border-b-[3px] border-[#222]" style={{ gridTemplateColumns: cols }}>
              <div className={`px-2 py-2 ${label} text-[#666] whitespace-nowrap text-left`}>code</div>
              {LANGS.map((l) => head(`name · ${l}`))}
              {LANGS.map((l) => head(`desc · ${l}`))}
              <div className={`px-2 py-2 ${label} text-[#666] whitespace-nowrap text-center`}>actions</div>
            </div>
            {options.map((o, i) => (
              <div key={i} className="grid items-center border-b-[2px] border-[#222]/10 hover:bg-[#FFF7D6] transition-colors"
                style={{ gridTemplateColumns: cols }}>
                <div className="px-2 py-2 font-mono text-[11px] font-bold truncate">{o.code || "—"}</div>
                {LANGS.map((l) => <div key={l} className="px-2 py-2 text-xs font-bold truncate">{o.name[l] || "—"}</div>)}
                {LANGS.map((l) => <div key={l} className="px-2 py-2 text-xs text-[#666] truncate">{o.description[l] || "—"}</div>)}
                <div className="px-2 py-2 flex items-center justify-center gap-1">
                  <button onClick={() => openEdit(i)} title={t("common.edit") ?? "Edit"} className="p-1 rounded hover:bg-[#e8e6e0] cursor-pointer"><Pencil size={13} /></button>
                  <button onClick={() => remove(i)} title={t("common.delete") ?? "Delete"} className="p-1 rounded hover:bg-[#F8D7DA] text-[#B54843] cursor-pointer"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {editing && <OptionModal initial={editing.item} onCancel={() => setEditing(null)} onSave={save} add={editing.index === -1} withDimensions={withDimensions} />}
    </section>
  );
}