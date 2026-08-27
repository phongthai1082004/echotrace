"use client";

import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";
import { neoBtnDanger, neoBtnPrimary } from "@/lib/styles";

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
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      cancelLabel={cancelLabel || t("common.cancel")}
      actions={[
        {
          label: confirmLabel || t("common.confirm"),
          onClick: onConfirm,
          className: variant === "danger" ? neoBtnDanger : neoBtnPrimary,
          disabled: busy,
          loading: busy,
        },
      ]}
    >
      <p className="text-sm text-[#666] mb-6">{message}</p>
    </Modal>
  );
}