"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { label, card } from "@/lib/styles";

type UserStatus = "active" | "banned";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  status: UserStatus;
  joinedAt: string;
}

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
    if (!token) return;
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
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: newStatus as UserStatus } : u));
    } catch {}
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || String(u.id).includes(q)) &&
      (filter === "all" || u.status === filter);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  const counts = {
    all: users.length,
    active: users.filter((u) => u.status === "active").length,
    banned: users.filter((u) => u.status === "banned").length,
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <p className="font-mono text-[10px] font-bold text-[#999]">Loading users…</p>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <div className="px-8 py-6 border-b-[3px] border-[#222] flex items-end justify-between gap-4">
        <div>
          <p className={`${label} mb-1 text-[#666]`}>Admin — Users</p>
          <h1 className="text-3xl font-bold">Users</h1>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-[#222] px-3 w-full lg:w-72 shrink-0">
          <Search size={13} className="text-[#999] shrink-0" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name, email, ID…"
            className="flex-1 text-sm font-bold py-2 placeholder:text-[#999] focus:outline-none bg-transparent" />
          {search && <button onClick={() => { setSearch(""); setPage(0); }} className="opacity-40 hover:opacity-70"><X size={12} /></button>}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-8 py-6 gap-6 min-h-0 overflow-hidden">
        <div className={`${card} p-4 shrink-0`}>
          <div className="flex gap-1">
            {(["all", "active", "banned"] as const).map((s) => (
              <button key={s} onClick={() => { setFilter(s); setPage(0); }}
                className={`font-mono text-[8px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md border-2 transition-all ${
                  filter === s ? "bg-[#222] text-white border-[#222]" : "border-transparent text-[#999] hover:text-[#222]"
                }`}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} <span className={filter === s ? "text-white/60" : "text-[#999]"}>({counts[s]})</span>
              </button>
            ))}
          </div>
        </div>

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
                <>
                  {paged.map((user) => (
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
                          className={`font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 cursor-pointer transition-all hover:opacity-80 ${
                            user.status === "active"
                              ? "bg-[#D4EDDA] text-[#155724] border-[#155724]"
                              : "bg-[#F8D7DA] text-[#721C24] border-[#721C24]"
                          }`}>
                          {user.status}
                        </button>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: perPage - paged.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex-1 grid border-b-[2px] border-[#222]/10" style={{ gridTemplateColumns: gridCols }}>
                      {Array.from({ length: 7 }).map((_, j) => <div key={j} className="px-2" />)}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="px-6 py-3 border-t-[3px] border-[#222] flex items-center justify-between bg-[#FFF7D6] shrink-0">
            <p className="font-mono text-[9px] font-bold text-[#666]">
              Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length} users
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className={`font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md border-2 transition-all ${
                  page === 0 ? "border-[#ccc] text-[#ccc]" : "border-[#222] text-[#666] hover:bg-[#e8e6e0]"
                }`}>Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className={`font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md border-2 transition-all ${
                  page >= totalPages - 1 ? "border-[#ccc] text-[#ccc]" : "border-[#222] text-[#666] hover:bg-[#e8e6e0]"
                }`}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
