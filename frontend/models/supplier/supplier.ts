export interface L10NText {
  vi: string;
  en: string;
  es: string;
}

export interface PaperSize {
  code: string;
  width: number;
  height: number;
}

export interface SupplierOption {
  code: string;
  name: L10NText;
  description: L10NText;
  width?: number | null;
  height?: number | null;
  price?: number | null;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  banned: boolean;
  totalDebt: number;
  overdueDebt: number;
  monthDebt: number;
  lastPaymentDate: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  paperSizeOptions: SupplierOption[];
  paperOptions: SupplierOption[];
  coverOptions: SupplierOption[];
  createdAt: string;
  updatedAt: string;
}
