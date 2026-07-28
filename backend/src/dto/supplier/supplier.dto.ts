export interface SupplierDTO {
  id: number;
  name: string;
  contact: string;
  email: string;
  status: string;
  totalDebt: number;
  overdueDebt: number;
  monthDebt: number;
  lastPaymentDate: Date | string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class SupplierMapper {
  static toDTO(supplier: any): SupplierDTO {
    return {
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      status: supplier.status,
      totalDebt: supplier.totalDebt,
      overdueDebt: supplier.overdueDebt,
      monthDebt: supplier.monthDebt,
      lastPaymentDate: supplier.lastPaymentDate ?? null,
      bankName: supplier.bankName ?? null,
      bankAccountNumber: supplier.bankAccountNumber ?? null,
      bankAccountName: supplier.bankAccountName ?? null,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  static toDTOList(suppliers: any[]): SupplierDTO[] {
    return suppliers.map((supplier) => this.toDTO(supplier));
  }
}