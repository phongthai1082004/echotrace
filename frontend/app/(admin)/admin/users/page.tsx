"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { label, card, neoBtn, neoBtnPrimary, input } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { AdminPagination } from "@/components/admin-pagination";
import { ResponsiveTable } from "@/components/responsive-table";
import { apiFetch } from "@/lib/api.fetch";
import { UserResponse } from "@/models/users/user.list";
import { User, UserStatus } from "@/models/users/user";
import { useToast } from "@/components/toast";
import { SkeletonTable } from "@/components/skeleton";
import { Eye, X, Save } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { timeSince } from "@/lib/duration";

const colWidths = ["1fr", "1.5fr", "0.5fr", "1fr", "70px", "80px", "90px", "50px"];
const gridCols = colWidths.join(" ");
const STATUS: UserStatus[] = ["active", "banned"];

interface AdminUsersPageProps {
  initialUsers?: User[];
  initialNextCursor?: string | null;
}

export default function AdminUsersPage({ initialUsers = [], initialNextCursor = null }: AdminUsersPageProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserStatus | "all">("all");
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [selected, setSelected] = useState<User | null>(null);
  const [statusForm, setStatusForm] = useState<UserStatus>("active");

  const fetchUsers = async (cursor?: string) => {
    if (!token) {
      showToast(t("admin.users.tokenInvalid"), "error");
      return;
    }
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (search) params.set("search", search);
    if (cursor) params.set("cursor", cursor);
    try {
      const data = await apiFetch<UserResponse>(`/api/admin/users?${params.toString()}`, token);
      setUsers(data.users ?? []);
      setNextCursor(data.nextCursor);
    } catch { showToast(t("admin.users.fetchFailed"), "error"); }
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchUsers(undefined).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timeout = setTimeout(() => {
      setCursorStack([]);
      fetchUsers(undefined);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, filter, token]);

  const handleNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, nextCursor]);
    fetchUsers(nextCursor);
  };

  const handlePrevious = () => {
    setCursorStack((prev) => {
      const stack = [...prev];
      stack.pop();
      const prevCursor = stack[stack.length - 1];
      fetchUsers(prevCursor);
      return stack;
    });
  };

  const openDetail = (u: User) => {
    setSelected(u);
    setStatusForm(u.status);
  };

  const handleSaveStatus = async () => {
    if (!selected) return;
    try {
      await apiFetch(`/api/admin/users/${selected.id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: statusForm }),
      });
      setUsers((prev) => prev.map((u) => u.id === selected.id ? { ...u, status: statusForm } : u));
      setSelected((prev) => prev ? { ...prev, status: statusForm } : null);
      showToast(t("admin.users.statusUpdated"), "success");
    } catch { showToast(t("admin.users.statusUpdateFailed"), "error"); }
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
          {loading ? (
            <SkeletonTable rows={8} cols={colWidths} />
          ) : (<>
          <ResponsiveTable
            header={
              <div className="grid shrink-0 border-b-[3px] border-[#222]" style={{ gridTemplateColumns: gridCols }}>
                {[t("admin.users.name"), t("admin.users.email"), t("admin.users.phone"), t("admin.users.city"), t("admin.users.joined"), t("admin.users.role"), t("admin.users.status"), t("common.action")].map((h) => (
                  <div key={h} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</div>
                ))}
              </div>
            }
            gridCols={gridCols}
          >
            {users.length === 0 ? (
              <div className="flex items-center justify-center py-10"><p className="text-lg font-bold">{t("admin.users.noUsers")}</p></div>
            ) : (
              users.map((user) => (
                <div key={user.id}
                  className="grid hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10 items-center py-3"
                  style={{ gridTemplateColumns: gridCols }}>
                  <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.name}</div>
                  <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.email}</div>
                  <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.phone || "—"}</div>
                  <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.city || "—"}</div>
                  <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{user.createdAt ? timeSince(user.createdAt) : "—"}</div>
                  <div className="px-2 whitespace-nowrap">
                    <span className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none px-2.5 py-1.5 rounded-[6px] border-2 inline-block whitespace-nowrap shadow-[2px_2px_0_#222] ${
                      user.role === "admin" ? "bg-[#222] text-white" : "bg-[#e8e6e0] text-[#444]"
                    }`} style={{ borderColor: "#222" }}>
                      {user.role}
                    </span>
                  </div>
                  <div className="px-2 whitespace-nowrap"><StatusBadge status={user.status} /></div>
                  <div className="px-2">
                    <button onClick={() => openDetail(user)}
                      className={`${neoBtn} p-1.5`}>
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </ResponsiveTable>
          <AdminPagination
            hasNext={nextCursor !== null}
            hasPrevious={cursorStack.length > 0}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
          </>)}
        </div>
      </div>

      {/* ── DETAIL SIDEBAR ── */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]" style={{ width: 420 }}>
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div>
                <p className={`${label} mb-1 text-[#666]`}>{t("admin.users.label")}</p>
                <h2 className="text-xl font-bold truncate max-w-[300px]">{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222] hover:translate-x-px hover:translate-y-[1px] transition-[transform,background-color]"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none">
              {/* Status */}
              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <h3 className="text-sm text-[#666] mb-3">{t("admin.users.status")}</h3>
                <div className="flex gap-2">
                  {STATUS.map((s) => {
                    const active = statusForm === s;
                    const meta = s === "active" ? { bg: "#D4EDDA", text: "#155724" } : { bg: "#F8D7DA", text: "#721C24" };
                    return (
                      <button key={s} onClick={() => {
                        if (selected.role === "admin") { showToast(t("admin.users.cantBanAdmin"), "error"); return; }
                        setStatusForm(s);
                      }}
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none rounded-[6px] px-2.5 py-1.5 border-2 transition-[opacity,border-color] ${
                          active ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100" : "border-transparent opacity-40 hover:opacity-70"
                        }`}
                        style={{ background: meta.bg, color: meta.text }}>
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
                  <div key={k}>
                    <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p>
                    <p className="text-sm font-bold">{v || "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
              <button onClick={handleSaveStatus}
                className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 py-3 ${
                  selected.role === "admin" ? "opacity-40 pointer-events-none" : ""
                }`}>
                <Save size={16} /> {t("common.save")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
