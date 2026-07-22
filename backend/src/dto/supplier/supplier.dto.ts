export interface SupplierListDTO {
  id: number;
  name: string;
  contact: string;
  email: string;
  totalDebt: number;
  overdueDebt: number;
  monthDebt: number;
  lastPaymentDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class SupplierMapper {
  static toDTO(supplier: any): SupplierListDTO {
    return {
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      totalDebt: supplier.totalDebt,
      overdueDebt: supplier.overdueDebt,
      monthDebt: supplier.monthDebt,
      lastPaymentDate: supplier.lastPaymentDate ?? null,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  static toDTOList(suppliers: any[]): SupplierListDTO[] {
    return suppliers.map((supplier) => this.toDTO(supplier));
  }
}