export interface Profile {
  id: number;
  email: string | null;
  name: string | null;
  avatar: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  status: string | null;
  hasPassword: boolean;
}
