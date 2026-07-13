export type OrderStatus = "pending" | "printing" | "quality-check" | "shipped";

export interface Order {
  id: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  product: string;
  amount: number;
  status: OrderStatus;
  date: string;
  pages: number;
  cover: "softcover" | "hardcover";
  notes: string;
  timeline: { date: string; label: string }[];
  supplierId: number;
}

export interface DispatchSupplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  activeOrders: number;
  totalDebt: number;
  overdueDebt: number;
  monthDebt: number;
}

export const dispatchSuppliers: DispatchSupplier[] = [
  { id: 1, name: "Nordic Paper Co.", contact: "+1 555-0101", email: "orders@nordicpaper.com", activeOrders: 4, totalDebt: 28450, overdueDebt: 4200, monthDebt: 12250 },
  { id: 2, name: "Craft Supply House", contact: "+1 555-0202", email: "info@craftsupply.com", activeOrders: 2, totalDebt: 12200, overdueDebt: 0, monthDebt: 5350 },
  { id: 3, name: "EcoBind Materials", contact: "+1 555-0303", email: "sales@ecobind.com", activeOrders: 6, totalDebt: 41800, overdueDebt: 8900, monthDebt: 18600 },
  { id: 4, name: "PrintTech Supplies", contact: "+1 555-0404", email: "support@printtech.io", activeOrders: 1, totalDebt: 6700, overdueDebt: 2100, monthDebt: 3200 },
  { id: 5, name: "PaperSource Inc.", contact: "+1 555-0505", email: "hello@papersource.com", activeOrders: 3, totalDebt: 19500, overdueDebt: 1500, monthDebt: 8100 },
  { id: 6, name: "BindRight Logistics", contact: "+1 555-0606", email: "ops@bindright.com", activeOrders: 5, totalDebt: 33100, overdueDebt: 6200, monthDebt: 14700 },
];

export const allOrders: Order[] = [
  { id: "ORD-1024", customer: "Amara Osei", email: "amara@gmail.com", phone: "+84 91 234 5678", address: "12 Nguyễn Huệ, Hà Nội", product: "Premium Matte Paper A4", amount: 3200, status: "shipped", date: "2026-07-10", pages: 48, cover: "softcover", notes: "", timeline: [{ date: "2026-07-01", label: "Order placed" }, { date: "2026-07-10", label: "Shipped" }], supplierId: 1 },
  { id: "ORD-1025", customer: "Léa Bouchard", email: "lea.b@outlook.fr", phone: "+33 6 12 34 56 78", address: "8 Rue du Faubourg, Paris", product: "Glossy Photo Paper 4x6", amount: 1800, status: "printing", date: "2026-07-09", pages: 32, cover: "softcover", notes: "Please use matte finish on cover.", timeline: [{ date: "2026-07-02", label: "Order placed" }, { date: "2026-07-05", label: "Printing started" }], supplierId: 1 },
  { id: "ORD-1026", customer: "Hiroshi Tanaka", email: "h.tanaka@yahoo.jp", phone: "+81 90 1234 5678", address: "2-4-1 Shinjuku, Tokyo", product: "Kraft Cardstock Sheets", amount: 5600, status: "pending", date: "2026-07-08", pages: 64, cover: "hardcover", notes: "Rush order — delivery by 15 July.", timeline: [{ date: "2026-07-08", label: "Order placed" }], supplierId: 1 },
  { id: "ORD-1027", customer: "Sofia Mäkinen", email: "sofia.m@gmail.com", phone: "+358 40 123 4567", address: "Mannerheimintie 14, Helsinki", product: "Linen Texture Cardstock", amount: 2750, status: "shipped", date: "2026-07-05", pages: 48, cover: "hardcover", notes: "", timeline: [{ date: "2026-06-28", label: "Order placed" }, { date: "2026-07-05", label: "Shipped" }], supplierId: 2 },
  { id: "ORD-1028", customer: "Marco Rossi", email: "m.rossi@libero.it", phone: "+39 320 123 4567", address: "Via Roma 32, Milano", product: "Gold Foil Sheets", amount: 1100, status: "printing", date: "2026-07-11", pages: 24, cover: "softcover", notes: "Gift wrap requested.", timeline: [{ date: "2026-07-11", label: "Order placed" }, { date: "2026-07-11", label: "Printing started" }], supplierId: 2 },
  { id: "ORD-1029", customer: "Priya Nair", email: "priya.n@gmail.com", phone: "+91 98765 43210", address: "MG Road 5, Bengaluru", product: "Spiral Binding Coils", amount: 980, status: "pending", date: "2026-07-12", pages: 16, cover: "softcover", notes: "", timeline: [{ date: "2026-07-12", label: "Order placed" }], supplierId: 3 },
  { id: "ORD-1030", customer: "James Okonkwo", email: "j.okonkwo@gmail.com", phone: "+234 801 234 5678", address: "15 Adeola Odeku St, Lagos", product: "Chipboard Covers 12x12", amount: 3400, status: "shipped", date: "2026-07-07", pages: 56, cover: "hardcover", notes: "Client requested spine embossing.", timeline: [{ date: "2026-06-25", label: "Order placed" }, { date: "2026-07-07", label: "Shipped" }], supplierId: 3 },
  { id: "ORD-1031", customer: "Amara Osei", email: "amara@gmail.com", phone: "+84 91 234 5678", address: "12 Nguyễn Huệ, Hà Nội", product: "Clear PVC Pockets", amount: 2100, status: "printing", date: "2026-07-06", pages: 40, cover: "softcover", notes: "Second order from this customer.", timeline: [{ date: "2026-07-06", label: "Order placed" }, { date: "2026-07-06", label: "Printing started" }], supplierId: 3 },
  { id: "ORD-1032", customer: "Léa Bouchard", email: "lea.b@outlook.fr", phone: "+33 6 12 34 56 78", address: "8 Rue du Faubourg, Paris", product: "Inkjet Printable Stickers", amount: 4500, status: "pending", date: "2026-07-13", pages: 72, cover: "hardcover", notes: "", timeline: [{ date: "2026-07-13", label: "Order placed" }], supplierId: 4 },
  { id: "ORD-1033", customer: "Hiroshi Tanaka", email: "h.tanaka@yahoo.jp", phone: "+81 90 1234 5678", address: "2-4-1 Shinjuku, Tokyo", product: "Recycled Kraft Paper", amount: 7200, status: "shipped", date: "2026-07-04", pages: 96, cover: "softcover", notes: "", timeline: [{ date: "2026-06-20", label: "Order placed" }, { date: "2026-07-04", label: "Shipped" }], supplierId: 5 },
  { id: "ORD-1034", customer: "Sofia Mäkinen", email: "sofia.m@gmail.com", phone: "+358 40 123 4567", address: "Mannerheimintie 14, Helsinki", product: "Vellum Tracing Paper", amount: 1600, status: "shipped", date: "2026-07-02", pages: 28, cover: "softcover", notes: "", timeline: [{ date: "2026-06-15", label: "Order placed" }, { date: "2026-07-02", label: "Shipped" }], supplierId: 5 },
  { id: "ORD-1035", customer: "Marco Rossi", email: "m.rossi@libero.it", phone: "+39 320 123 4567", address: "Via Roma 32, Milano", product: "Wire Binding Elements", amount: 2800, status: "printing", date: "2026-07-11", pages: 44, cover: "hardcover", notes: "", timeline: [{ date: "2026-07-11", label: "Order placed" }, { date: "2026-07-11", label: "Printing started" }], supplierId: 6 },
  { id: "ORD-1036", customer: "Priya Nair", email: "priya.n@gmail.com", phone: "+91 98765 43210", address: "MG Road 5, Bengaluru", product: "Hardcover Book Cloth", amount: 5100, status: "pending", date: "2026-07-10", pages: 80, cover: "hardcover", notes: "", timeline: [{ date: "2026-07-10", label: "Order placed" }], supplierId: 6 },
];

export const unassignedOrders: Order[] = [
  { id: "ORD-2001", customer: "", email: "", phone: "", address: "", product: "UV Coating Spray 400ml", amount: 850, status: "pending", date: "2026-07-14", pages: 0, cover: "softcover", notes: "", timeline: [], supplierId: 0 },
  { id: "ORD-2002", customer: "", email: "", phone: "", address: "", product: "Bone Folder Tool (Pack 10)", amount: 420, status: "pending", date: "2026-07-14", pages: 0, cover: "softcover", notes: "", timeline: [], supplierId: 0 },
  { id: "ORD-2003", customer: "", email: "", phone: "", address: "", product: "Self-Healing Cutting Mat A3", amount: 1290, status: "pending", date: "2026-07-13", pages: 0, cover: "softcover", notes: "", timeline: [], supplierId: 0 },
  { id: "ORD-2004", customer: "", email: "", phone: "", address: "", product: "Corner Rounder Punch 3mm", amount: 350, status: "pending", date: "2026-07-13", pages: 0, cover: "softcover", notes: "", timeline: [], supplierId: 0 },
  { id: "ORD-2005", customer: "", email: "", phone: "", address: "", product: "Bookbinding Thread Linen", amount: 230, status: "pending", date: "2026-07-12", pages: 0, cover: "softcover", notes: "", timeline: [], supplierId: 0 },
  { id: "ORD-2006", customer: "", email: "", phone: "", address: "", product: "Acid-Free Glue Stick 250ml", amount: 680, status: "pending", date: "2026-07-12", pages: 0, cover: "softcover", notes: "", timeline: [], supplierId: 0 },
  { id: "ORD-2007", customer: "", email: "", phone: "", address: "", product: "Paper Trimmer 12-inch", amount: 2100, status: "pending", date: "2026-07-11", pages: 0, cover: "softcover", notes: "", timeline: [], supplierId: 0 },
  { id: "ORD-2008", customer: "", email: "", phone: "", address: "", product: "Heat Tool Embossing Gun", amount: 3450, status: "pending", date: "2026-07-11", pages: 0, cover: "softcover", notes: "", timeline: [], supplierId: 0 },
];
