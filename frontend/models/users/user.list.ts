import { User } from '@/models/users/user'

export interface UserResponse {
  users: User[]; 
  nextCursor: string | null;
}