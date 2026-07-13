"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { label, card } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { AdminPagination } from "@/components/admin-pagination";
import type { User, UserStatus } from "@/lib/mock-users";
import { MOCK_USERS } from "@/lib/mock-users";

const colWidths = ["60px", "1fr", "1fr", "140px", "60px", "100px", "100px"];
const gridCols = colWidths.join(" ");

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserStatus | "all">("all");
  const [page, setPage] = useState(0);
  const perPage = 8;

  const fetchUsers = async () => {
    if (!token) { setUsers(MOCK_USERS); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data?.users || data.users || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [token]);

  const toggleStatus = async (id: number, current: UserStatus) => {
    const newStatus = current === "active" ? "banned" : "active";
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: newStatus as UserStatus } : u));
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || String(u.id).includes(q)) &&
      (filter === "all" || u.status === filter);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <p className="font-mono text-[10px] font-bold text-[#999]">Loading users…</p>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label="Admin — Users" title="Users">
        <AdminSearch value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name, email, ID…" />
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 py-6 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: "All", count: users.length },
            { key: "active", label: "Active", count: users.filter((u) => u.status === "active").length },
            { key: "banned", label: "Banned", count: users.filter((u) => u.status === "banned").length },
          ]}
          selected={filter}
          onChange={(k) => { setFilter(k as UserStatus | "all"); setPage(0); }}
        />

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="grid shrink-0 border-b-[3px] border-[#222]" style={{ gridTemplateColumns: gridCols }}>
              {["ID", "Name", "Email", "Phone", "Orders", "Joined", "Status"].map((h) => (
                <div key={h} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</div>
              ))}
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              {paged.length === 0 ? (
                <div className="flex-1 flex items-center justify-center"><p className="text-lg font-bold">No users found</p></div>
              ) : (
                paged.map((user) => (
                  <div key={user.id}
                    className="grid flex-1 hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10 items-center"
                    style={{ gridTemplateColumns: gridCols }}>
                    <div className="px-2 font-mono text-[10px] font-bold text-[#666] whitespace-nowrap">{user.id}</div>
                    <div className="px-2 text-sm font-bold whitespace-nowrap">{user.name}</div>
                    <div className="px-2 text-sm font-bold whitespace-nowrap">{user.email}</div>
                    <div className="px-2 font-mono text-[10px] font-bold text-[#666] whitespace-nowrap">{user.phone || "—"}</div>
                    <div className="px-2 font-mono text-[10px] font-bold text-[#666] whitespace-nowrap">{user.orders || 0}</div>
                    <div className="px-2 font-mono text-[10px] font-bold text-[#999] whitespace-nowrap">{user.joinedAt?.split("T")[0] || "—"}</div>
                    <div className="px-2 whitespace-nowrap">
                      <button onClick={() => toggleStatus(user.id, user.status)}
                        className={`font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 cursor-pointer transition-opacity hover:opacity-80 ${
                          user.status === "active"
                            ? "bg-[#D4EDDA] text-[#155724] border-[#155724]"
                            : "bg-[#F8D7DA] text-[#721C24] border-[#721C24]"
                        }`}>{user.status}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <AdminPagination page={page} totalPages={totalPages} total={filtered.length} perPage={perPage} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}

