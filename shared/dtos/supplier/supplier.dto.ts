export interface L10NText {
  vi: string;
  en: string;
  es: string;
}

export interface SupplierOption {
  code: string;
  name: L10NText;
  description: L10NText;
  price?: number | null;
}

export interface SupplierDTO {
  id: number;
  name: string;
  contact: string;
  email: string;
  banned: boolean;
  totalDebt: number;
  overdueDebt: number;
  monthDebt: number;
  lastPaymentDate: Date | string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  paperSizeOptions: SupplierOption[];
  paperOptions: SupplierOption[];
  coverOptions: SupplierOption[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CatalogSize extends SupplierOption {
  width: number | null;
  height: number | null;
}

export interface AggregatedOptionsResponse {
  sizes: CatalogSize[];
  papers: SupplierOption[];
  covers: SupplierOption[];
}

export interface PriceOptionsResponse {
  papers: SupplierOption[];
  covers: SupplierOption[];
}

function asArray(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

export class SupplierMapper {
  static toDTO(supplier: any): SupplierDTO {
    return {
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      banned: !!supplier.isDelete,
      totalDebt: supplier.totalDebt,
      overdueDebt: supplier.overdueDebt,
      monthDebt: supplier.monthDebt,
      lastPaymentDate: supplier.lastPaymentDate ?? null,
      bankName: supplier.bankName ?? null,
      bankAccountNumber: supplier.bankAccountNumber ?? null,
      bankAccountName: supplier.bankAccountName ?? null,
      paperSizeOptions: asArray(supplier.paperSizeOptions),
      paperOptions: asArray(supplier.paperOptions),
      coverOptions: asArray(supplier.coverOptions),
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  static toDTOList(suppliers: any[]): SupplierDTO[] {
    return suppliers.map((supplier) => this.toDTO(supplier));
  }
}