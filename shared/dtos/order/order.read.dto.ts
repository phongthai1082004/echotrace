import { OrderStatus, ReturnState, ReturnFault, DefectState } from "../../enums/order.enum.js";
import { OrderItem } from "../cart/cart.dto.js";

export interface OrderUserSummary {
  id: number;
  name: string | null;
  email: string;
}

export interface OrderSupplierSummary {
  id: number;
  name: string;
  contact: string;
  email: string;
}

// Read-model cho 1 order — dùng chung bởi backend (serialize) và frontend (view).
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
  paymentType: string;
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
  orderItems: OrderItem[] | null;
  codReconciledAt?: string | null;
  qrCode?: string | null;
  checkoutUrl?: string | null;
  expiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  returnState?: ReturnState | null;
  returnFault?: ReturnFault | null;
  returnReason?: string | null;
  defectState?: DefectState | null;
  user?: OrderUserSummary | null;
  supplier?: OrderSupplierSummary | null;
}
