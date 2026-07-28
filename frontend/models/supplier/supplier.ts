export interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  status: string;
  totalDebt: number;
  overdueDebt: number;
  monthDebt: number;
  lastPaymentDate: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  createdAt: string;
  updatedAt: string;
}
