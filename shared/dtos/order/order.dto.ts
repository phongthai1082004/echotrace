import { PaymentPlan } from "../../enums/payment.enum.js";
import { OrderStatus, DefectState } from "../../enums/order.enum.js";
import { IsString, IsOptional, IsInt, IsIn, IsArray, IsNumber, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

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

// Admin PATCH /admin/orders/:id — mirrors service whitelist (status/defectState
// enums, integer supplierId). Unknown fields stripped by whitelist.
export class UpdateOrderDTO {
  @IsIn(Object.values(OrderStatus))
  @IsOptional()
  status?: string;

  @IsInt()
  @IsOptional()
  supplierId?: number;

  @IsString()
  @IsOptional()
  trackingCode?: string;

  @IsIn(Object.values(DefectState))
  @IsOptional()
  defectState?: string;
}

// Admin POST /admin/orders/album — shape check at the gate, business rules stay in service.
export class AlbumOrderDTO {
  @IsInt()
  customerId!: number;

  @IsInt()
  sampleBookId!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsIn(Object.values(PaymentPlan))
  paymentMethod!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  couponCode?: string | null;

  @IsString()
  @IsOptional()
  utmSource?: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;
}

// Admin POST /admin/orders/:id/events — shape check at the gate (assign items,
// deliver/reconcile indices, force status). Business rules stay in service.
export const ORDER_EVENT_TYPES = [
  'assign',
  'ship',
  'deliver',
  'reconcile_supplier',
  'reconcile_cod',
  'refund',
  'reconcile_refund',
  'force_status',
] as const;

export class ProcessEventItemDTO {
  @IsInt()
  itemIndex!: number;

  @IsInt()
  supplierId!: number;

  @IsNumber()
  @Min(0)
  costPrice!: number;
}

export class ProcessEventDTO {
  @IsIn(ORDER_EVENT_TYPES)
  type!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessEventItemDTO)
  @IsOptional()
  items?: ProcessEventItemDTO[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  itemIndices?: number[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}