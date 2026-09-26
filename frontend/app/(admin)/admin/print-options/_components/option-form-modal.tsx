"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PrintOption, PRINT_OPTION_TYPES } from "@/models/print-option/print-option";
import { label, neoBtn, neoBtnPrimary, input } from "@/lib/styles";
import { Modal } from "@/components/ui/modal";
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
    const payload = form.type === "paperSize" ? { ...form, price: null } : form;
    const ok = await onSave(option, payload);
    setSaving(false);
    if (ok) onClose();
  };

  const upd = (patch: Partial<OptionForm>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Modal
      open
      onClose={onClose}
      title={t(option ? "admin.printOptions.editTitle" : "admin.printOptions.createTitle")}
      widthClass="w-[480px] max-w-[92vw]"
      cancelLabel={t("common.cancel")}
      actions={[{ label: t("common.save"), onClick: handleSave, primary: true, loading: saving }]}
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto py-1">
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

        {form.type !== "paperSize" && (
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
        )}
      </div>
    </Modal>
  );
}
