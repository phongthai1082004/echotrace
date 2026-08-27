"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "@/models/users/user";
import { card } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { useUsers } from "./_hooks/use-users";
import { UsersTable } from "./_components/users-table";
import { UserDetailDrawer } from "./_components/user-detail-drawer";

interface AdminUsersPageProps {
  initialUsers?: User[];
  initialNextCursor?: string | null;
}

export default function AdminUsersPage({ initialUsers = [], initialNextCursor = null }: AdminUsersPageProps) {
  void initialUsers;
  void initialNextCursor;
  const { t } = useTranslation();
  const {
    search,
    setSearch,
    filter,
    setFilter,
    users,
    loading,
    nextCursor,
    cursorStack,
    handleNext,
    handlePrevious,
    updateStatus,
    refresh,
  } = useUsers();

  const [selected, setSelected] = useState<User | null>(null);

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.users.label")} title={t("admin.users.title")}>
        <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.users.searchPlaceholder")} />
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 max-[1440px]:py-4 max-[1280px]:py-3 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: t("admin.filterTabs.all") },
            { key: "active", label: t("admin.filterTabs.active") },
            { key: "banned", label: t("admin.filterTabs.banned") },
          ]}
          selected={filter}
          onChange={(k) => setFilter(k as typeof filter)}
        />

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
          <UsersTable
            users={users}
            loading={loading}
            hasNext={nextCursor !== null}
            hasPrevious={cursorStack.length > 0}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onOpen={setSelected}
          />
        </div>
      </div>

      {selected && (
        <UserDetailDrawer
          user={selected}
          onSave={async (status) => {
            if (!selected) return;
            await updateStatus(selected.id, status);
            refresh();
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
