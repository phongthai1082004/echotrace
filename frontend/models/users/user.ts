export type UserStatus = "active" | "banned";

export interface User {
  id: number;
  email: string | null;
  name: string | null;
  avatar: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: UserStatus;
  role: string;
  createdAt: string;
}