"use client";

import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import { User } from "@/models/users/user";
import { chip, neoBtn } from "@/lib/styles";
import { AdminList } from "@/components/admin-list";
import { AdminPagination } from "@/components/admin-pagination";
import { EmptyStateMinimal } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { timeSince } from "@echotrace/shared";

export function UsersTable({
  users,
  loading,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  onOpen,
}: {
  users: User[];
  loading: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onOpen: (u: User) => void;
}) {
  const { t } = useTranslation();
  return (
    <AdminList
      columns={[
        { key: "name", label: t("admin.users.name"), width: "1fr" },
        { key: "email", label: t("admin.users.email"), width: "1.4fr" },
        { key: "phone", label: t("admin.users.phone"), width: "1fr" },
        { key: "city", label: t("admin.users.city"), width: "0.8fr" },
        { key: "joined", label: t("admin.users.joined"), width: "100px" },
        { key: "role", label: t("admin.users.role"), width: "80px" },
        { key: "status", label: t("admin.users.status"), width: "90px", align: "center" },
        { key: "action", label: t("common.action"), width: "80px", align: "center" },
      ]}
      data={users}
      loading={loading}
      rowKey={(user) => user.id}
      empty={<EmptyStateMinimal title={t("admin.users.noUsers")} description={t("admin.users.createFirstUser")} />}
      footer={
        <AdminPagination hasNext={hasNext} hasPrevious={hasPrevious} onNext={onNext} onPrevious={onPrevious} />
      }
      renderRow={(user: User) => (
        <>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.name}</div>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.email}</div>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.phone || "—"}</div>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.city || "—"}</div>
          <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">
            {user.createdAt ? timeSince(user.createdAt) : "—"}
          </div>
          <div className="px-2 whitespace-nowrap">
            <span className={`${chip} ${user.role === "admin" ? "bg-[#222] text-white" : "bg-[#e8e6e0] text-[#444]"}`}>
              {user.role}
            </span>
          </div>
          <div className="px-2 flex justify-center whitespace-nowrap">
            <StatusBadge status={user.isDelete ? "banned" : "active"} />
          </div>
          <div className="px-2 flex justify-center">
            <button onClick={() => onOpen(user)} className={`${neoBtn} p-1.5`}>
              <Eye size={14} />
            </button>
          </div>
        </>
      )}
    />
  );
}
