export interface OrderItem {
  id: number;
  bookTitle: string;
  coverUrl: string;
  pages: number;
  style: string;
  coverType: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  status: "pending" | "printing" | "quality-check" | "shipped" | "delivered";
  orderCode: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  paymentMethod: "FULL" | "DEPOSIT";
  name: string;
  phone: string;
  address: string;
  city: string;
  note: string;
  timeline: { label: string; date: string; done: boolean }[];
}

export const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "pending", bg: "#FFF7D6", text: "#222" },
  printing: { label: "printing", bg: "#FFD93D", text: "#222" },
  "quality-check": { label: "qualityCheck", bg: "#9CB8A8", text: "#222" },
  shipped: { label: "shipped", bg: "#5A8F4A", text: "#fff" },
  delivered: { label: "delivered", bg: "#5A8F4A", text: "#fff" },
};

export const timelineKeyMap: Record<string, string> = {
  "Order placed": "customer.orders.timeline.placed",
  "Payment confirmed": "customer.orders.timeline.paymentConfirmed",
  Printing: "customer.orders.timeline.printing",
  "Quality check": "customer.orders.timeline.qualityCheck",
  Shipped: "customer.orders.timeline.shipped",
  Delivered: "customer.orders.timeline.delivered",
};

// ponytail: mock data — thay bằng GET /orders khi backend có module orders.
export const mockOrders: Order[] = [
  {
    id: "1",
    date: "2024-07-01",
    status: "pending",
    orderCode: "TC-0041",
    items: [
      {
        id: 1,
        bookTitle: "West Africa Circuit",
        coverUrl: "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=400&h=530&fit=crop&auto=format",
        pages: 48,
        style: "modern",
        coverType: "softcover",
        quantity: 1,
        price: 490000,
      },
    ],
    totalAmount: 490000,
    paidAmount: 0,
    discountAmount: 0,
    paymentMethod: "FULL",
    name: "Amara Osei",
    phone: "+84 91 234 5678",
    address: "12 Nguyễn Huệ",
    city: "Hà Nội",
    note: "",
    timeline: [
      { label: "Order placed", date: "2024-07-01", done: true },
      { label: "Payment confirmed", date: "", done: false },
      { label: "Printing", date: "", done: false },
      { label: "Shipped", date: "", done: false },
    ],
  },
  {
    id: "2",
    date: "2024-06-15",
    status: "quality-check",
    orderCode: "TC-0033",
    items: [
      {
        id: 2,
        bookTitle: "Dolomite Journals",
        coverUrl: "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=400&h=530&fit=crop&auto=format",
        pages: 56,
        style: "classic",
        coverType: "hardcover",
        quantity: 1,
        price: 690000,
      },
    ],
    totalAmount: 690000,
    paidAmount: 690000,
    discountAmount: 0,
    paymentMethod: "FULL",
    name: "Lea Bisset",
    phone: "+33 6 12 34 56 78",
    address: "8 Rue du Faubourg",
    city: "Paris",
    note: "Rush order — delivery by 15 July.",
    timeline: [
      { label: "Order placed", date: "2024-06-15", done: true },
      { label: "Payment confirmed", date: "2024-06-15", done: true },
      { label: "Quality check", date: "2024-06-22", done: true },
      { label: "Shipped", date: "", done: false },
    ],
  },
  {
    id: "3",
    date: "2024-06-05",
    status: "shipped",
    orderCode: "TC-0029",
    items: [
      {
        id: 3,
        bookTitle: "Lagos to Accra",
        coverUrl: "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=400&h=530&fit=crop&auto=format",
        pages: 32,
        style: "vintage",
        coverType: "softcover",
        quantity: 1,
        price: 390000,
      },
    ],
    totalAmount: 390000,
    paidAmount: 390000,
    discountAmount: 0,
    paymentMethod: "FULL",
    name: "Hiro Tanaka",
    phone: "+81 90 1234 5678",
    address: "2-4-1 Shinjuku",
    city: "Tokyo",
    note: "",
    timeline: [
      { label: "Order placed", date: "2024-06-05", done: true },
      { label: "Payment confirmed", date: "2024-06-05", done: true },
      { label: "Printing", date: "2024-06-06", done: true },
      { label: "Shipped", date: "2024-06-10", done: true },
    ],
  },
  {
    id: "4",
    date: "2024-05-12",
    status: "delivered",
    orderCode: "TC-0021",
    items: [
      {
        id: 4,
        bookTitle: "Mekong Delta",
        coverUrl: "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=400&h=530&fit=crop&auto=format",
        pages: 40,
        style: "modern",
        coverType: "hardcover",
        quantity: 1,
        price: 590000,
      },
    ],
    totalAmount: 590000,
    paidAmount: 590000,
    discountAmount: 0,
    paymentMethod: "FULL",
    name: "Sofia Martens",
    phone: "+358 40 123 4567",
    address: "Mannerheimintie 14",
    city: "Helsinki",
    note: "Gift wrap requested.",
    timeline: [
      { label: "Order placed", date: "2024-05-12", done: true },
      { label: "Payment confirmed", date: "2024-05-12", done: true },
      { label: "Printing", date: "2024-05-13", done: true },
      { label: "Delivered", date: "2024-05-25", done: true },
    ],
  },
];
