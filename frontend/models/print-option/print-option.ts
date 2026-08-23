import { L10NText, SupplierOption } from "@/models/supplier/supplier";

export interface PrintOption extends SupplierOption {
  id: number;
  type: string;
}

export const PRINT_OPTION_TYPES = ["paperSize", "paper", "cover"] as const;
export type PrintOptionType = (typeof PRINT_OPTION_TYPES)[number];