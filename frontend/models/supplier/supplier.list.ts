import { SupplierDTO } from "@echotrace/shared";

export interface SupplierResponse {
  items: SupplierDTO[];
  nextCursor: number | null;
}
