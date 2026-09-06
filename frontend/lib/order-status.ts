import type { OrderDTO, OrderStatus } from "./order.dto";

// Màu cho badge/bút chì status — nguồn duy nhất, StatusBadge cũng dùng
export const ORDER_STATUS_COLORS: Record<OrderStatus, { color: string; text: string }> = {
  pending_payment: { color: "#FFF7D6", text: "#222" },
  paid: { color: "#FFD93D", text: "#222" },
  partially_paid: { color: "#8E7CC3", text: "#fff" },
  processing: { color: "#9CB8A8", text: "#222" },
  shipping: { color: "#5A8F4A", text: "#fff" },
  delivered: { color: "#222", text: "#fff" },
  cancelled: { color: "#B54843", text: "#fff" },
  pending_refund: { color: "#F2C14E", text: "#222" },
  refunded: { color: "#999999", text: "#fff" },
};

export const STATUS_LABEL_KEY = (s: string) =>
  `orderStatuses.${s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`;

export const totalCopies = (o: OrderDTO) => (o.orderItems ?? []).reduce((sum, i) => sum + i.quantity, 0);

export function STATUS_META(t: (k: string) => string): Record<OrderStatus, { label: string; color: string; text: string }> {
  return Object.fromEntries(
    Object.entries(ORDER_STATUS_COLORS).map(([s, c]) => [
      s,
      { ...c, label: t(STATUS_LABEL_KEY(s)) },
    ]),
  ) as Record<OrderStatus, { label: string; color: string; text: string }>;
}

export function formatCurrency(n: number | null | undefined) {
  return `${(n ?? 0).toLocaleString("vi-VN")}₫`;
}

// ponytail: timeline mock — derive từ status, chưa có bảng OrderHistory; thay khi có audit log
const PROGRESSION = ["placed", "paymentConfirmed", "printing", "shipped", "delivered"] as const;
const STAGE_OF: Record<OrderStatus, number> = {
  pending_payment: 0,
  paid: 1,
  partially_paid: 1,
  processing: 2,
  shipping: 3,
  delivered: 4,
  cancelled: 0,
  pending_refund: 4,
  refunded: 4,
};

export function mockTimeline(
  status: OrderStatus,
  createdAt?: string,
): { labelKey: string; date: string; done: boolean }[] {
  const stage = STAGE_OF[status];
  if (status === "cancelled" || status === "pending_refund" || status === "refunded") {
    return [
      { labelKey: `customer.orders.timeline.placed`, date: createdAt ?? "", done: true },
      { labelKey: `orderStatuses.${status}`, date: "", done: true },
    ];
  }
  return PROGRESSION.map((step, i) => ({
    labelKey: `customer.orders.timeline.${step}`,
    date: i === stage ? (createdAt ?? "") : "",
    done: i <= stage,
  }));
}
