"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { PrintOption, PRINT_OPTION_TYPES } from "@/models/print-option/print-option";
import { label, neoBtn, neoBtnPrimary, input } from "@/lib/styles";
import { CloseButton } from "@/components/ui/close-button";
import { OptionForm, emptyForm, num, withNum } from "../_hooks/use-print-options";

const LANGS = ["vi", "en", "es"] as const;

export function OptionFormModal({
  option,
  onSave,
  onClose,
}: {
  option: PrintOption | null;
  onSave: (option: PrintOption | null, form: OptionForm) => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<OptionForm>(() =>
    option
      ? {
          type: option.type,
          code: option.code,
          name: { ...option.name },
          description: { ...option.description },
          width: option.width ?? null,
          height: option.height ?? null,
          price: option.price ?? null,
        }
      : emptyForm(),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(option, form);
    setSaving(false);
    if (ok) onClose();
  };

  const upd = (patch: Partial<OptionForm>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center">
      <div
        className="bg-[#F8F2E5] rounded-[10px] border-[3px] border-[#222] shadow-[6px_6px_0_#222] w-[480px] max-w-[92vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b-[3px] border-[#222] bg-[#F8F2E5] rounded-t-[10px]">
          <h3 className="text-[15px] font-extrabold uppercase tracking-wide">
            {t(option ? "admin.printOptions.editTitle" : "admin.printOptions.createTitle")}
          </h3>
          <CloseButton onClick={onClose} />
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          <div>
            <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.type")}</p>
            <div className="flex gap-2">
              {PRINT_OPTION_TYPES.map((tp) => (
                <button
                  key={tp}
                  onClick={() => upd({ type: tp })}
                  className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${
                    form.type === tp ? neoBtnPrimary : neoBtn
                  }`}
                >
                  {t(`admin.printOptions.types.${tp}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.code")}</p>
            <input
              className={input}
              value={form.code}
              onChange={(e) => upd({ code: e.target.value })}
              placeholder={t("admin.printOptions.codePlaceholder")}
            />
          </div>

          <div>
            <p className={`${label} text-xs text-[#666] mb-2`}>{t("admin.printOptions.name")}</p>
            <div className="space-y-2">
              {LANGS.map((l) => (
                <input
                  key={l}
                  className={input}
                  value={form.name[l]}
                  onChange={(e) => upd({ name: { ...form.name, [l]: e.target.value } })}
                  placeholder={`${l.toUpperCase()} — ${t("admin.printOptions.name")}`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className={`${label} text-xs text-[#666] mb-2`}>{t("admin.printOptions.description")}</p>
            <div className="space-y-2">
              {LANGS.map((l) => (
                <input
                  key={l}
                  className={input}
                  value={form.description[l]}
                  onChange={(e) => upd({ description: { ...form.description, [l]: e.target.value } })}
                  placeholder={`${l.toUpperCase()} — ${t("admin.printOptions.description")}`}
                />
              ))}
            </div>
          </div>

          {form.type === "paperSize" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.width")}</p>
                <input className={input} value={num(form.width)} onChange={(e) => setForm((f) => withNum(f, "width", e.target.value))} />
              </div>
              <div>
                <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.height")}</p>
                <input className={input} value={num(form.height)} onChange={(e) => setForm((f) => withNum(f, "height", e.target.value))} />
              </div>
            </div>
          )}

          <div>
            <p className={`${label} text-xs text-[#666] mb-1`}>{t("admin.printOptions.price")}</p>
            <input
              className={input}
              value={num(form.price)}
              onChange={(e) => {
                const n = e.target.value.trim() === "" ? null : Number(e.target.value);
                upd({ price: Number.isNaN(n) ? null : n });
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t-[3px] border-[#222]">
          <button onClick={onClose} className={`${neoBtn} px-4 py-2`}>
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`${neoBtnPrimary} flex items-center gap-2 px-4 py-2 disabled:opacity-40`}
          >
            <Save size={14} /> {saving ? `${t("common.save")}…` : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
