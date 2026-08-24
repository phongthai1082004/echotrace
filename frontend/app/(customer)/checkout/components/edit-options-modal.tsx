"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NeoSelect } from "@/components/neo-select";
import { neoBtn, neoBtnPrimary, labelSm } from "@/lib/styles";

export function EditOptionsModal({
  item,
  optionLabel,
  optionList,
  onClose,
  onSave,
}: {
  item: any;
  optionLabel: (code: string, key: "covers" | "papers") => string;
  optionList: (key: "covers" | "papers") => { value: string; label: string }[];
  onClose: () => void;
  onSave: (bookId: number, cover: string, paper: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [editForm, setEditForm] = useState({ cover: item.cover || "", paper: item.paper || "" });
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-lg font-bold mb-5">{t("customer.checkout.editOptions")}</p>

        <div className="space-y-5">
          <div>
            <label className="block">
              <span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">
                {t("customer.checkout.cover")}
              </span>
              <NeoSelect
                options={optionList("covers")}
                value={editForm.cover}
                onChange={(v) => setEditForm((f) => ({ ...f, cover: v }))}
              />
            </label>
            <p className="font-mono text-[10px] text-[#999] mt-1.5">
              {optionLabel(editForm.cover, "covers") || "\u00A0"}
            </p>
          </div>

          <div>
            <label className="block">
              <span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">
                {t("customer.checkout.paper")}
              </span>
              <NeoSelect
                options={optionList("papers")}
                value={editForm.paper}
                onChange={(v) => setEditForm((f) => ({ ...f, paper: v }))}
              />
            </label>
            <p className="font-mono text-[10px] text-[#999] mt-1.5">
              {optionLabel(editForm.paper, "papers") || "\u00A0"}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className={`${neoBtn} ${labelSm} flex-1 py-3`}>
            {t("customer.checkout.cancel")}
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(item.bookId, editForm.cover, editForm.paper);
                onClose();
              } catch {
              } finally {
                setSaving(false);
              }
            }}
            className={`${neoBtnPrimary} flex-1 py-3`}
          >
            {saving ? "..." : t("customer.checkout.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
