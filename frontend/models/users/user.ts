export type UserStatus = "active" | "banned";

export interface User {
  id: number;
  email: string | null;
  name: string | null;
  avatar: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  isDelete: boolean;
  role: string;
  createdAt: string;
}