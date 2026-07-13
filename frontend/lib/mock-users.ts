export type UserStatus = "active" | "banned";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  status: UserStatus;
  joinedAt: string;
}

export const MOCK_USERS: User[] = [
  { id: 1, name: "Amara Osei", email: "amara@gmail.com", phone: "+84 91 234 5678", orders: 4, status: "active", joinedAt: "2026-01-15T00:00:00Z" },
  { id: 2, name: "Léa Bouchard", email: "lea.b@outlook.fr", phone: "+33 6 12 34 56 78", orders: 2, status: "active", joinedAt: "2026-02-20T00:00:00Z" },
  { id: 3, name: "Hiroshi Tanaka", email: "h.tanaka@yahoo.jp", phone: "+81 90 1234 5678", orders: 7, status: "active", joinedAt: "2026-03-08T00:00:00Z" },
  { id: 4, name: "Sofia Mäkinen", email: "sofia.m@gmail.com", phone: "+358 40 123 4567", orders: 1, status: "banned", joinedAt: "2026-03-22T00:00:00Z" },
  { id: 5, name: "Marco Rossi", email: "m.rossi@libero.it", phone: "+39 320 123 4567", orders: 5, status: "active", joinedAt: "2026-04-11T00:00:00Z" },
  { id: 6, name: "Priya Nair", email: "priya.n@gmail.com", phone: "+91 98765 43210", orders: 3, status: "active", joinedAt: "2026-05-05T00:00:00Z" },
  { id: 7, name: "James Okonkwo", email: "j.okonkwo@gmail.com", phone: "+234 801 234 5678", orders: 0, status: "banned", joinedAt: "2026-05-30T00:00:00Z" },
  { id: 8, name: "Alice Nguyen", email: "alice.nguyen@gmail.com", phone: "+84 28 1234 5678", orders: 6, status: "active", joinedAt: "2026-06-18T00:00:00Z" },
];
