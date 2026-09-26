import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import type { UserResponse } from "@/models/users/user.list";
import { UsersClient } from "./_components/users-client";

// Props initialUsers/initialNextCursor nối vào đúng chỗ đã chờ sẵn ở island.
export default async function AdminUsersPage() {
  const { token } = await getPageContext();

  let initialUsers: UserResponse["users"] | undefined;
  let initialNextCursor: string | null | undefined;
  if (token) {
    try {
      const d = await apiFetch<UserResponse>("/api/admin/users?limit=20", token);
      initialUsers = d?.users ?? [];
      initialNextCursor = d?.nextCursor ?? null;
    } catch {
    }
  }

  return <UsersClient initialUsers={initialUsers} initialNextCursor={initialNextCursor} />;
}
