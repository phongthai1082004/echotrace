export type KanbanStatus = "pending" | "printing" | "quality-check" | "shipped";

export type KanbanOrder = {
  id: string;
  customer: string;
  journal: string;
  pages: number;
  amount: string;
  date: string;
  status: KanbanStatus;
};

export const COLUMNS: { id: KanbanStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "printing", label: "Printing" },
  { id: "quality-check", label: "Quality Check" },
  { id: "shipped", label: "Shipped" },
];

export const kanbanOrders: KanbanOrder[] = [
  { id: "TC-0041", customer: "Amara Osei", journal: "West Africa Circuit", pages: 48, amount: "₫2,400,000", date: "2024-07-01", status: "pending" },
  { id: "TC-0039", customer: "Léa Bouchard", journal: "Bordeaux Harvest", pages: 32, amount: "₫1,800,000", date: "2024-06-28", status: "pending" },
  { id: "TC-0037", customer: "Hiroshi Tanaka", journal: "Shikoku Pilgrimage", pages: 64, amount: "₫3,200,000", date: "2024-06-25", status: "printing" },
  { id: "TC-0035", customer: "Sofia Mäkinen", journal: "Finnish Archipelago", pages: 48, amount: "₫2,400,000", date: "2024-06-20", status: "printing" },
  { id: "TC-0033", customer: "Marco Rossi", journal: "Dolomite Journals", pages: 56, amount: "₫2,800,000", date: "2024-06-15", status: "quality-check" },
  { id: "TC-0031", customer: "Priya Nair", journal: "Kerala Backwaters", pages: 40, amount: "₫2,000,000", date: "2024-06-10", status: "shipped" },
  { id: "TC-0029", customer: "James Okonkwo", journal: "Lagos to Accra", pages: 32, amount: "₫1,800,000", date: "2024-06-05", status: "shipped" },
];

export const analyticsData = [
  { month: "Jan", revenue: 18400000, orders: 7 },
  { month: "Feb", revenue: 22100000, orders: 9 },
  { month: "Mar", revenue: 19800000, orders: 8 },
  { month: "Apr", revenue: 31200000, orders: 13 },
  { month: "May", revenue: 28700000, orders: 12 },
  { month: "Jun", revenue: 34500000, orders: 14 },
  { month: "Jul", revenue: 41200000, orders: 17 },
];
