// Dùng chung cho customer orders + admin dispatch — khớp Order model backend
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "partially_paid"
  | "processing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "refunding"
  | "refunded";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "partially_paid",
  "processing",
  "shipping",
  "delivered",
  "cancelled",
  "refunding",
  "refunded",
];

export interface OrderItemDTO {
  bookId?: number;
  title: string;
  quantity: number;
  pages?: number;
  cover?: string;
  paper?: string;
  paperSize?: string;
  price?: number | null;
  sku?: string;
  thumbnailUrl?: string | null;
  supplierId?: number | null;
  costPrice?: number | null;
  reconciledAt?: string | null;
  deliveredAt?: string | null;
}

export interface OrderDTO {
  id: number;
  orderCode: string | null;
  userId: number;
  supplierId?: number | null;
  subTotal: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  discountAmount: number;
  paymentType: string; // full-payment | half-payment
  status: OrderStatus;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  note?: string | null;
  couponCode?: string | null;
  orderShippingFee?: number | null;
  supplierShippingFee?: number | null;
  trackingCode?: string | null;
  orderItems: OrderItemDTO[] | null;
  codReconciledAt?: string | null;
  qrCode?: string | null;
  checkoutUrl?: string | null;
  expiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // join phía admin
  user?: { id: number; name: string | null; email: string } | null;
  supplier?: { id: number; name: string; contact: string; email: string } | null;
}
