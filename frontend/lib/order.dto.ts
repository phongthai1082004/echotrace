// Khớp Order model backend. Contract types nằm ở @echotrace/shared (single source of truth).
import type { OrderStatus, OrderItem, OrderDTO } from "@echotrace/shared";

export type { OrderStatus, OrderItem, OrderDTO };
// Alias backward-compatible cho consumer hiện tại
export type OrderItemDTO = OrderItem;

export const ORDER_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "partially_paid",
  "processing",
  "shipping",
  "delivered",
  "cancelled",
  "pending_refund",
  "refunded",
];
