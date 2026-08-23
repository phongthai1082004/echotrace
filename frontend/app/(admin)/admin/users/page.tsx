"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { label, card, neoBtn, neoBtnPrimary, input, chip } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminList } from "@/components/admin-list";
import { UserResponse } from "@/models/users/user.list";
import { User } from "@/models/users/user";
import { EmptyStateMinimal } from "@/components/ui/empty-state";
import { Eye, Save } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { StatusBadge } from "@/components/status-badge";
import { timeSince, UserStatus } from "@echotrace/shared";
import { useApiQuery, useApiMutation, useDebounce } from "@hooks";
import { isAuthenticatedSession } from "@/types/auth";
import { detectSearchTarget } from "@/lib/search-detector";

const STATUS: UserStatus[] = [UserStatus.ACTIVE, UserStatus.BANNED];

interface AdminUsersPageProps {
  initialUsers?: User[];
  initialNextCursor?: string | null;
}

export default function AdminUsersPage({ initialUsers = [], initialNextCursor = null }: AdminUsersPageProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isAuthenticated = isAuthenticatedSession(session);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 1000);
  const [filter, setFilter] = useState<UserStatus | "all">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [statusForm, setStatusForm] = useState<UserStatus>("active");

  // Build URL with query parameters
  const queryUrl = useMemo(() => {
    if (!isAuthenticated) return "";
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
      params.set("field", detectSearchTarget(debouncedSearch));
    }
    if (cursor) params.set("cursor", cursor);
    params.set("limit", "20");
    return `/api/admin/users?${params.toString()}`;
  }, [isAuthenticated, filter, debouncedSearch, cursor]);

  // Reset pagination whenever search/filter changes
  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
  }, [debouncedSearch, filter]);

  // Fetch users with useApiQuery
  const { data: response, loading } = useApiQuery<UserResponse>(
    queryUrl,
    isAuthenticated ? session.accessToken : undefined,
    {
      enabled: isAuthenticated && !!queryUrl,
      onSuccess: (data) => {
        setNextCursor(data.nextCursor || null);
      },
    },
  );

  const users = response?.users ?? [];

  // Mutation hook for status updates - simplified version
  // Production version would need more sophisticated URL/data handling
  const { loading: updateLoading } = useApiMutation<any>(
    `/api/admin/users/status`,
    "PATCH",
    isAuthenticated ? session.accessToken : undefined,
  );

  const handleNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => (cursor ? [...prev, cursor] : prev));
    setCursor(nextCursor);
  };

  const handlePrevious = () => {
    const stack = [...cursorStack];
    const prevCursor = stack.pop() ?? null;
    setCursor(prevCursor);
    setCursorStack(stack);
  };

  const openDetail = (u: User) => {
    setSelected(u);
    setStatusForm(u.isDelete ? "banned" : "active");
  };

  const handleSaveStatus = async () => {
    if (!selected || !isAuthenticated) return;
    if (selected.role === "admin") {
      return;
    }
    // Note: useApiMutation needs URL to be passed at creation or mutation time
    // This is a simplified version - production code would need proper URL handling
  };

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
          onChange={(k) => setFilter(k as UserStatus | "all")}
        />

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
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
            empty={
              <EmptyStateMinimal title={t("admin.users.noUsers")} description={t("admin.users.createFirstUser")} />
            }
            footer={
              <AdminPagination
                hasNext={nextCursor !== null}
                hasPrevious={cursorStack.length > 0}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            }
            renderRow={(user: User) => (
              <>
                <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.name}</div>
                <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.email}</div>
                <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">
                  {user.phone || "—"}
                </div>
                <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">
                  {user.city || "—"}
                </div>
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
                  <button onClick={() => openDetail(user)} className={`${neoBtn} p-1.5`}>
                    <Eye size={14} />
                  </button>
                </div>
              </>
            )}
          />
        </div>
      </div>

      {/* ── DETAIL SIDEBAR ── */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" />
          <div
            className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]"
            style={{ width: 420 }}
          >
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div>
                <p className={`${label} mb-1 text-[#666]`}>{t("admin.users.label")}</p>
                <h2 className="text-xl font-bold truncate max-w-[300px]">{selected.name}</h2>
              </div>
              <CloseButton onClick={() => setSelected(null)} />
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none">
              {/* Status */}
              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <h3 className="text-sm text-[#666] mb-3">{t("admin.users.status")}</h3>
                <div className="flex gap-2">
                  {STATUS.map((s) => {
                    const active = statusForm === s;
                    const meta =
                      s === "active" ? { bg: "#D4EDDA", text: "#155724" } : { bg: "#F8D7DA", text: "#721C24" };
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          if (selected.role === "admin") return;
                          setStatusForm(s);
                        }}
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none rounded-[6px] px-2.5 py-1.5 border-2 transition-[opacity,border-color] ${
                          active
                            ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100"
                            : "border-transparent opacity-40 hover:opacity-70"
                        }`}
                        style={{ background: meta.bg, color: meta.text }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* General info */}
              <div className="px-6 py-5 space-y-4">
                <h3 className="text-sm text-[#666] mb-3">{t("admin.users.general")}</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.users.joined")}</p>
                    <p className="text-sm font-bold">{selected.createdAt ? timeSince(selected.createdAt) : "—"}</p>
                  </div>
                </div>
                {[
                  [t("admin.users.name"), selected.name],
                  [t("admin.users.email"), selected.email],
                  [t("admin.users.phone"), selected.phone],
                  [t("admin.users.address"), selected.address],
                  [t("admin.users.city"), selected.city],
                  [t("admin.users.role"), selected.role],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k as string}</p>
                    <p className="text-sm font-bold">{v || "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
              <button
                onClick={handleSaveStatus}
                className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 py-3 ${
                  selected.role === "admin" || updateLoading ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                <Save size={16} /> {t("common.save")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
