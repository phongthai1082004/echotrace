import { Supplier } from "./supplier";

export interface SupplierResponse {
  items: Supplier[];
  nextCursor: number | null;
}
