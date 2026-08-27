"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NeoSelect } from "@/components/neo-select";
import { Modal } from "@/components/ui/modal";

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.bookId, editForm.cover, editForm.paper);
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("customer.checkout.editOptions")}
      cancelLabel={t("customer.checkout.cancel")}
      actions={[{ label: t("customer.checkout.save"), onClick: handleSave, primary: true, loading: saving }]}
    >
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
    </Modal>
  );
}
