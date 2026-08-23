"use client";

import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/dialog";
import { neoBtn, neoBtnPrimary, neoBtnDanger } from "@/lib/styles";

type Variant = "danger" | "primary";

export function YesNoPopup({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  busy = false,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  busy?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onCancel}>
      <div className="bg-[#F8F2E5] border-[3px] border-[#222] shadow-[6px_6px_0_#222] p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-[#666] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={busy} className={`${neoBtn} px-4 py-2 text-sm font-bold disabled:opacity-40`}>
            {cancelLabel || t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`${variant === "danger" ? neoBtnDanger : neoBtnPrimary} px-4 py-2 text-sm font-bold disabled:opacity-40`}
          >
            {confirmLabel || t("common.confirm")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}