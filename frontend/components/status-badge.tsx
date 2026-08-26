"use client";

import { useTranslation } from "react-i18next";
import { chip } from "@/lib/styles";
import { ORDER_STATUS_COLORS, STATUS_LABEL_KEY } from "@/lib/order-status";

type BadgeVariant =
  | "collected"
  | "hold"
  | "paid"
  | "unpaid"
  | "pending"
  | "printing"
  | "quality-check"
  | "shipped"
  | "active"
  | "banned"
  | "default";

const variants: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  collected: { bg: "#E6F4E6", text: "#2D6A2D", border: "#2D6A2D" },
  paid: { bg: "#E6F4E6", text: "#2D6A2D", border: "#2D6A2D" },
  hold: { bg: "#FFF8E1", text: "#B8860B", border: "#D4A017" },
  unpaid: { bg: "#FFF8E1", text: "#B8860B", border: "#D4A017" },
  pending: { bg: "#e8e6e0", text: "#666", border: "#222" },
  printing: { bg: "#FFD93D", text: "#222", border: "#222" },
  "quality-check": { bg: "#e8e6e0", text: "#222", border: "#222" },
  shipped: { bg: "#5A8F4A", text: "#fff", border: "#5A8F4A" },
  active: { bg: "#D4EDDA", text: "#155724", border: "#222" },
  banned: { bg: "#F8D7DA", text: "#721C24", border: "#222" },
  default: { bg: "#FFF7D6", text: "#222", border: "#222" },
};

const statusKeys: Record<string, string> = {
  collected: "collected",
  hold: "holdByShipper",
  paid: "paid",
  unpaid: "unpaid",
  pending: "pending",
  printing: "printing",
  "quality-check": "qualityCheck",
  shipped: "shipped",
};

export function StatusBadge({ status, label }: { status: BadgeVariant | string; label?: string }) {
  const { t } = useTranslation();

  // Status của Order (backend) — màu/nhãn từ nguồn chung lib/order-status
  const orderColor = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS];
  if (orderColor && !label) {
    return (
      <span className={`${chip} leading-none`} style={{ background: orderColor.color, color: orderColor.text, borderColor: "#222" }}>
        {t(STATUS_LABEL_KEY(status))}
      </span>
    );
  }

  const v = variants[status as BadgeVariant] ?? variants.default;
  const statusKey = statusKeys[status];
  const defaultLabel = statusKey
    ? t(`admin.statusBadge.${statusKey}`)
    : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`${chip} leading-none`}
      style={{ background: v.bg, color: v.text, borderColor: "#222" }}
    >
      {label ?? defaultLabel}
    </span>
  );
}
