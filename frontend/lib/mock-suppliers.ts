export type SupplierStatus = "active" | "inactive";

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  activeOrders: number;
  totalDebt: number;
  overdueDebt: number;
  status: SupplierStatus;
}

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 1, name: "Nordic Paper Co.", contact: "+1 555-0101", email: "orders@nordicpaper.com", activeOrders: 4, totalDebt: 28450, overdueDebt: 4200, status: "active" },
  { id: 2, name: "Craft Supply House", contact: "+1 555-0202", email: "info@craftsupply.com", activeOrders: 2, totalDebt: 12200, overdueDebt: 0, status: "active" },
  { id: 3, name: "EcoBind Materials", contact: "+1 555-0303", email: "sales@ecobind.com", activeOrders: 6, totalDebt: 41800, overdueDebt: 8900, status: "active" },
  { id: 4, name: "PrintTech Supplies", contact: "+1 555-0404", email: "support@printtech.io", activeOrders: 1, totalDebt: 6700, overdueDebt: 2100, status: "inactive" },
  { id: 5, name: "PaperSource Inc.", contact: "+1 555-0505", email: "hello@papersource.com", activeOrders: 3, totalDebt: 19500, overdueDebt: 1500, status: "active" },
  { id: 6, name: "BindRight Logistics", contact: "+1 555-0606", email: "ops@bindright.com", activeOrders: 5, totalDebt: 33100, overdueDebt: 6200, status: "active" },
  { id: 7, name: "Pacific Bindery Co.", contact: "+1 555-0707", email: "info@pacificbindery.com", activeOrders: 0, totalDebt: 0, overdueDebt: 0, status: "inactive" },
  { id: 8, name: "Metro Print Partners", contact: "+1 555-0808", email: "dispatch@metroprint.com", activeOrders: 8, totalDebt: 52300, overdueDebt: 11400, status: "active" },
];

export function formatCurrency(n: number) {
  return "$" + n.toLocaleString("en-US");
}
