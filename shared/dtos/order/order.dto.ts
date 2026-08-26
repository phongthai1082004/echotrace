import { PaymentPlan } from "../../enums/payment.enum.js";

export interface CreateOrderItem {
  bookId: number;
  quantity: number;
  cover: string;
  paper: string;
  paperSize: string;
}

export interface CreateOrderDTO {
  items: CreateOrderItem[];
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  note?: string;
  paymentMethod: PaymentPlan;
  couponCode?: string | null;
}

export function parseCreateOrderDTO(rawBody: string): CreateOrderDTO {
  const data = JSON.parse(rawBody);
  
  return {
    paymentMethod: data.paymentMethod,
    items: (data.items || []).map((item: any) => ({
      bookId: Number(item.bookId),
      quantity: Number(item.quantity),
      cover: item.cover,
      paper: item.paper,
      paperSize: item.paperSize,
    })),
    name: data.name,
    phone: data.phone,
    address: data.address,
    city: data.city,
    note: data.note,
    couponCode: data.couponCode ?? null,
  };
}