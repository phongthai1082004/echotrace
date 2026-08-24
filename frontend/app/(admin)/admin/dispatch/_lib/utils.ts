import type { OrderStatus } from "@/lib/mock-dispatch";

export function STATUS_META(t: (k: string) => string): Record<OrderStatus, { label: string; color: string; text: string }> {
  return {
    pending: { label: t("admin.dispatch.filterPending"), color: "#FFF7D6", text: "#222" },
    printing: { label: t("admin.dispatch.filterPrinting"), color: "#FFD93D", text: "#222" },
    "quality-check": { label: t("admin.dispatch.filterQualityCheck"), color: "#9CB8A8", text: "#222" },
    shipped: { label: t("admin.dispatch.filterShipped"), color: "#5A8F4A", text: "#fff" },
  };
}

export function formatCurrency(n: number) {
  return "$" + n.toLocaleString("en-US");
}
