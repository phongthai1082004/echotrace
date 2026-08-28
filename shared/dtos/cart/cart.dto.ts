import { DiscountType, MinOrderType } from "../../enums/discount.enum.js";
import { makeSku } from "../../utils/sku.js";

export interface CartItem {
  bookId: number;
  title: string;
  style: string;
  font: string;
  cover: string;
  paper: string | null;
  paperHeight: number;
  paperWidth: number;
  pages: number;
  paperSize?: string | null;
  price?: number | null;
  coverUrl: string | null;
  pdfUrl?: string | null;
  type?: string | null;
  quantity: number;
  thumbnailUrl?: string | null;
}

export interface CartCoupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  minOrderType: string;
  maxDiscountAmount: number | null;
  maxUsageCount: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | Date | null;
}

export interface CartDTO {
  id: number;
  userId: number;
  parsedItems: CartItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

type ContentLike = { pages?: Array<Record<string, unknown>> } | string | null | undefined;

function asPages(content: ContentLike): Array<Record<string, unknown>> {
  let c: any = content;
  if (typeof c === "string") {
    try { c = JSON.parse(c); } catch { return []; }
  }
  return Array.isArray(c?.pages) ? c.pages : [];
}

export function bookPages(content: ContentLike): number {
  return asPages(content).length;
}

export function firstPageThumbnail(content: ContentLike): string | null {
  const thumb = asPages(content)[0]?.thumbnailUrl;
  return typeof thumb === "string" ? thumb : null;
}

export function composeCartItem(row: { quantity: number; cover: string | null; paper: string | null; paperSize: string | null }, book: any): CartItem {
  return {
    bookId: book.id,
    title: book.title,
    style: book.style,
    font: book.font,
    cover: row.cover ?? book.cover ?? "softcover",
    paper: row.paper ?? null,
    paperSize: row.paperSize ?? null,
    paperHeight: book.paperHeight ?? 0,
    paperWidth: book.paperWidth ?? 0,
    pages: bookPages(book.content),
    price: null,
    coverUrl: book.coverUrl ?? null,
    pdfUrl: null,
    type: book.type ?? null,
    quantity: row.quantity || 1,
    thumbnailUrl: firstPageThumbnail(book.content),
  };
}

// Slim snapshot stored in Order.orderItems (JSON). Only the fields the order
// lifecycle actually reads — NOT the full CartItem (style/font/coverUrl/pdfUrl/
// paperHeight/paperWidth/type are cart-only and never used after checkout).
export interface OrderItem {
  bookId: number;
  title: string;
  thumbnailUrl: string | null;
  pages: number;
  quantity: number;
  cover: string | null;
  paper: string | null;
  paperSize: string | null;
  price: number | null;
  sku: string | null;
}

export function toOrderItem(item: {
  bookId: number;
  title: string;
  thumbnailUrl?: string | null;
  pages: number;
  quantity: number;
  cover: string | null;
  paper: string | null;
  paperSize?: string | null;
  price?: number | null;
}, nameEn?: { cover?: string | null; paper?: string | null; paperSize?: string | null }): OrderItem {
  return {
    bookId: item.bookId,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl ?? null,
    pages: item.pages,
    quantity: item.quantity || 1,
    cover: item.cover ?? null,
    paper: item.paper ?? null,
    paperSize: item.paperSize ?? null,
    price: item.price ?? null,
    sku: makeSku(item.cover ?? "", item.paper ?? "", item.paperSize ?? "", nameEn),
  };
}

// Pure — dùng chung BE (calculateCart) và FE (tính lại discount khi tick/đổi qty).
export function computeCouponDiscount(coupon: CartCoupon | null | undefined, subtotal: number, items: Pick<CartItem, "quantity">[]): number {
  if (!coupon || !coupon.isActive) return 0;
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return 0;
  if (coupon.maxUsageCount > 0 && (coupon.usedCount ?? 0) >= coupon.maxUsageCount) return 0;
  const orderQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const meetsMin =
    (coupon.minOrderType || "VALUE").toLowerCase() === MinOrderType.QUANTITY
      ? orderQty >= (coupon.minOrderAmount ?? 0)
      : subtotal >= (coupon.minOrderAmount ?? 0);
  if (!meetsMin) return 0;
  const type = (coupon.discountType || "").toLowerCase();
  const raw = type === DiscountType.PERCENTAGE ? (subtotal * (coupon.discountValue ?? 0)) / 100 : coupon.discountValue ?? 0;
  const capped = coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw;
  return Math.max(0, capped);
}
