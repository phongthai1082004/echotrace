"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { SampleBookDTO, SampleBookType, SampleBookStatus } from "@echotrace/shared";
import { card, input, label, neoBtn, neoBtnPrimary } from "@/lib/styles";

const TYPE_OPTIONS: SampleBookDTO["type"][] = Object.values(SampleBookType);
const STATUS_OPTIONS = Object.values(SampleBookStatus);

export function EditModal({
  book,
  onSave,
  onClose,
}: {
  book: SampleBookDTO;
  onSave: (body: { type: "ALBUM" | "TEMPLATE"; quantity: number | null; status: string }) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [editForm, setEditForm] = useState<{ type: "ALBUM" | "TEMPLATE"; quantity: number; status: string }>({
    type: book.type,
    quantity: book.quantity ?? 0,
    status: book.status,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // only albums carry a quantity; templates always reset it
      const quantity = editForm.type === "ALBUM" ? editForm.quantity : null;
      await onSave({ type: editForm.type, quantity, status: editForm.status });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className={`${card} w-96 p-5`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm truncate">{book.name || "Untitled"}</p>
          <CloseButton onClick={onClose} size={14} />
        </div>

        <div className="space-y-4">
          <div>
            <p className={`${label} mb-1`}>{t("admin.sampleBooks.type")}</p>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => setEditForm((f) => ({ ...f, type: v as "ALBUM" | "TEMPLATE" }))}
                  className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${
                    editForm.type === v ? neoBtnPrimary : neoBtn
                  }`}
                >
                  {t(`admin.sampleBooks.${v === "ALBUM" ? "kindAlbum" : "kindTemplate"}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={`${label} mb-1`}>{t("admin.sampleBooks.quantity")}</p>
            <input
              type="number"
              min={0}
              value={editForm.quantity}
              disabled={editForm.type !== "ALBUM"}
              onChange={(e) => setEditForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              className={`${input} disabled:opacity-40`}
            />
            {editForm.type !== "ALBUM" && (
              <p className="text-[10px] text-[#999] mt-1">{t("admin.sampleBooks.quantityAlbumOnly")}</p>
            )}
          </div>

          <div>
            <p className={`${label} mb-1`}>{t("admin.sampleBooks.status")}</p>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  onClick={() => setEditForm((f) => ({ ...f, status: st }))}
                  className={`flex-1 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 ${
                    editForm.status === st ? neoBtnPrimary : neoBtn
                  }`}
                >
                  {t(`admin.sampleBooks.${st}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className={`${neoBtn} font-mono text-[9px] font-bold tracking-widest uppercase flex-1 py-3`}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-40`}
            >
              <Save size={16} /> {saving ? `${t("common.save")}…` : t("common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
