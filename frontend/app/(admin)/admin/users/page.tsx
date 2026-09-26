import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import type { UserResponse } from "@/models/users/user.list";
import { UsersClient } from "./_components/users-client";

// ponytail: page server — AdminHeader (h1 LCP) + rows đầu render sẵn thành HTML.
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
      // ponytail: để undefined cho island fetch lại qua proxy, đừng gán [] (kẹt trống).
    }
  }

  return <UsersClient initialUsers={initialUsers} initialNextCursor={initialNextCursor} />;
}
