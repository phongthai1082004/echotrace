import { UserListDTO } from "@echotrace/shared";

export interface UserResponse {
  users: UserListDTO[];
  nextCursor: string | null;
}
