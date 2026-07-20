"use client";

import { useTranslation } from "react-i18next";

type BadgeVariant = "collected" | "hold" | "paid" | "unpaid" | "pending" | "printing" | "quality-check" | "shipped" | "default";

const variants: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  collected: { bg: "#E6F4E6", text: "#2D6A2D", border: "#2D6A2D" },
  paid: { bg: "#E6F4E6", text: "#2D6A2D", border: "#2D6A2D" },
  hold: { bg: "#FFF8E1", text: "#B8860B", border: "#D4A017" },
  unpaid: { bg: "#FFF8E1", text: "#B8860B", border: "#D4A017" },
  pending: { bg: "#e8e6e0", text: "#666", border: "#222" },
  printing: { bg: "#FFD93D", text: "#222", border: "#222" },
  "quality-check": { bg: "#e8e6e0", text: "#222", border: "#222" },
  shipped: { bg: "#5A8F4A", text: "#fff", border: "#5A8F4A" },
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
    <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border-2 inline-block whitespace-nowrap"
      style={{ background: v.bg, color: v.text, borderColor: v.border }}>
      {label ?? defaultLabel}
    </span>
  );
}
