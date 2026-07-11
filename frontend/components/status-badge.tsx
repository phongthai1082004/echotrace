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

const labels: Record<string, string> = {
  collected: "Collected", hold: "Hold by Shipper", paid: "Paid", unpaid: "Unpaid",
  pending: "Pending", printing: "Printing", "quality-check": "Quality Check", shipped: "Shipped",
};

export function StatusBadge({ status, label }: { status: BadgeVariant | string; label?: string }) {
  const v = variants[status as BadgeVariant] ?? variants.default;
  return (
    <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border-2 inline-block whitespace-nowrap"
      style={{ background: v.bg, color: v.text, borderColor: v.border }}>
      {label ?? labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
