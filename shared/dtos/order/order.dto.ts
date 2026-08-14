import { PaymentDeposit } from "../../enums/payment.enum.js";

export interface OrderItem {
  bookId: number | null;
  title: string;
  style: string;
  font: string;
  cover: string;
  paper: string;
  paperHeight: number;
  paperWidth: number;
  pages: number;
  coverUrl: string | null;
  pdfUrl?: string | null;
  quantity: number;
}

export interface OrderDTO {
  id: number;
  orderCode: string | null;
  userId: number;
  supplierId: number | null;
  subTotal: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  paymentType: string;
  paymentStatus: string;
  status: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  note: string | null;
  couponId: number | null;
  discountAmount: number;
  orderShippingFee: number | null;
  supplierShippingFee: number | null;
  trackingCode: string | null;
  orderItems: any | null;
  parsedItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export function parseOrderItems(raw: any): OrderItem[] {
  try {
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function serializeOrderItems(items: OrderItem[]): OrderItem[] {
  return items;
}

export interface OrderTotals {
  subTotal: number;
  discountAmount: number;
  orderShippingFee: number;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
}

export const DEPOSIT_RATIO: Record<PaymentDeposit, number> = {
  [PaymentDeposit.FULL_PAYMENT]: 1,
  [PaymentDeposit.HALF_PAYMENT]: 0.5,
};

export interface ComputeTotalsInput {
  items: OrderItem[];
  pricePerItem?: number;  // Price should be calculated from supplier pricing, not stored in item
  discountAmount?: number;
  orderShippingFee?: number;
}

export function computeOrderTotals(input: ComputeTotalsInput): OrderTotals {
  // Price calculation logic should come from supplier pricing matrix lookup
  // For now, use provided pricePerItem or default to 0
  const pricePerItem = input.pricePerItem ?? 0;
  const subTotal = input.items.reduce((sum, i) => sum + pricePerItem * (i.quantity || 1), 0);
  const discountAmount = input.discountAmount ?? 0;
  const orderShippingFee = input.orderShippingFee ?? 0;
  const totalAmount = Math.max(0, subTotal - discountAmount + orderShippingFee);
  return {
    subTotal,
    discountAmount,
    orderShippingFee,
    totalAmount,
    depositAmount: 0,
    remainingAmount: totalAmount,
  };
}

export function applyDeposit(totals: OrderTotals, deposit: PaymentDeposit): OrderTotals {
  const ratio = DEPOSIT_RATIO[deposit] ?? 1;
  const depositAmount = Math.round(totals.totalAmount * ratio);
  return { ...totals, depositAmount, remainingAmount: totals.totalAmount - depositAmount };
}

export class OrderMapper {
  static toDTO(order: any): OrderDTO {
    const parsedItems = parseOrderItems(order.orderItems);
    return {
      id: order.id,
      orderCode: order.orderCode,
      userId: order.userId,
      supplierId: order.supplierId,
      subTotal: order.subTotal,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      paidAmount: order.paidAmount,
      paymentType: order.paymentType,
      paymentStatus: order.paymentStatus,
      status: order.status,
      name: order.name,
      phone: order.phone,
      address: order.address,
      city: order.city,
      note: order.note,
      couponId: order.couponId,
      discountAmount: order.discountAmount,
      orderShippingFee: order.orderShippingFee,
      supplierShippingFee: order.supplierShippingFee,
      trackingCode: order.trackingCode,
      orderItems: order.orderItems,
      parsedItems,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
