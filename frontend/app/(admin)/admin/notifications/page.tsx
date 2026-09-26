import { AdminHeader } from "@/components/admin-header";
import { getPageContext } from "@/lib/page-context";
import { NotificationsClient } from "./_components/notifications-client";

// (đọc từ store chung đã nạp ở bootstrap + SSE live).
export default async function AdminNotificationsPage() {
  const { t } = await getPageContext();

  return (
    <div>
      <AdminHeader label={t("admin.broadcast.label")} title={t("admin.sidebar.notifications")} />
      <NotificationsClient />
    </div>
  );
}
