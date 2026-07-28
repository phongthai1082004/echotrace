"use client";

import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/dialog";

export function YesNoPopup({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel,
  cancelLabel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onCancel}>
      <div className="bg-white w-full max-w-sm rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
        <div className="px-6 py-5">
          <p className="font-bold text-base mb-2">{title}</p>
          <p className="font-mono text-[11px] text-[#666] mb-5">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="font-mono text-[9px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-lg border-2 border-[#222] hover:bg-[#e8e6e0] transition-[background-color]"
            >
              {cancelLabel || t("common.cancel")}
            </button>
            <button
              onClick={onConfirm}
              className="font-mono text-[9px] font-bold tracking-widest uppercase px-5 py-2.5 bg-[#222] text-white rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow]"
            >
              {confirmLabel || t("common.confirm")}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
