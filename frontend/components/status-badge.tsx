"use client";

import { useTranslation } from "react-i18next";

type BadgeVariant = "collected" | "hold" | "paid" | "unpaid" | "pending" | "printing" | "quality-check" | "shipped" | "active" | "banned" | "default";

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
  collected: "collected", hold: "holdByShipper", paid: "paid", unpaid: "unpaid",
  pending: "pending", printing: "printing", "quality-check": "qualityCheck", shipped: "shipped",
};

export function StatusBadge({ status, label }: { status: BadgeVariant | string; label?: string }) {
  const { t } = useTranslation();
  const v = variants[status as BadgeVariant] ?? variants.default;
  const statusKey = statusKeys[status];
  const defaultLabel = statusKey ? t(`admin.statusBadge.${statusKey}`) : status.charAt(0).toUpperCase() + status.slice(1);
  
  return (
    <span className="font-mono text-[9px] font-bold tracking-widest uppercase leading-none px-2.5 py-1.5 rounded-[6px] border-2 inline-block whitespace-nowrap shadow-[2px_2px_0_#222]"
      style={{ background: v.bg, color: v.text, borderColor: "#222" }}>
      {label ?? defaultLabel}
    </span>
  );
}
