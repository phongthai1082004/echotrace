"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { label, card } from "@/lib/styles";
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
const colWidths = ["1.2fr", "1.5fr", "120px", "1fr", "100px", "80px", "100px"];
const gridCols = colWidths.join(" ");

interface AdminUsersPageProps {
  initialUsers?: User[];
  initialNextCursor?: string | null;
}

export default function AdminUsersPage({ initialUsers = [], initialNextCursor = null }: AdminUsersPageProps) {
  const {showToast } = useToast();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserStatus | "all">("all");
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const fetchUsers = async (cursor?: string) => {
    if (!token) {
      showToast("Token is invalid!", "error");
      return;
    };
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (search) params.set("search", search);
    if (cursor) params.set("cursor", cursor);

    try {
      const data = await apiFetch<UserResponse>(`/api/admin/users?${params.toString()}`, token);
      console.log(data);
      setUsers(data.users ?? []);
      setNextCursor(data.nextCursor);
    } catch (error) {
      showToast("Fetch users failed!", "error");
      console.error("Fetch error:", error);
    }
  };

  useEffect(() => {
    if (!token) return;
    const start = Date.now();
    setLoading(true);
    fetchUsers(undefined).finally(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= 500) setLoading(false);
      else setTimeout(() => setLoading(false), 500 - elapsed);
    });
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

  const toggleStatus = (id: number, current: UserStatus) => {
    const newStatus = current === "active" ? "banned" : "active";
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: newStatus as UserStatus } : u)));
  };

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label="Admin — Users" title="Users">
        <AdminSearch value={search} onChange={setSearch} placeholder="Search name, email, ID…" />
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 max-[1440px]:py-4 max-[1280px]:py-3 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: "All", count: users.length },
            { key: "active", label: "Active", count: users.filter((u) => u.status === "active").length },
            { key: "banned", label: "Banned", count: users.filter((u) => u.status === "banned").length },
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
                {["Name", "Email", "Phone", "Address", "City", "Role", "Status"].map((h) => (
                  <div key={h} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</div>
                ))}
              </div>
            }
            gridCols={gridCols}
          >
            {users.length === 0 ? (
              <div className="flex items-center justify-center py-10"><p className="text-lg font-bold">No users found</p></div>
            ) : (
              users.map((user) => (
                <div key={user.id}
                  className="grid hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10 items-center py-3"
                  style={{ gridTemplateColumns: gridCols }}>
                  <div className="px-2 text-sm font-bold whitespace-nowrap">{user.name}</div>
                  <div className="px-2 text-sm font-bold whitespace-nowrap">{user.email}</div>
                  <div className="px-2 font-mono text-[10px] font-bold text-[#666] whitespace-nowrap">{user.phone || "—"}</div>
                  <div className="px-2 text-sm text-[#666] truncate">{user.address || "—"}</div>
                  <div className="px-2 font-mono text-[10px] font-bold text-[#666] whitespace-nowrap">{user.city || "—"}</div>
                  <div className="px-2 font-mono text-[10px] font-bold whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${user.role === "admin" ? "bg-[#222] text-white" : "bg-[#e8e6e0] text-[#666]"}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="px-2 whitespace-nowrap">
                    <button onClick={() => toggleStatus(user.id, user.status)}
                      className={`font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 cursor-pointer transition-opacity hover:opacity-80 ${
                        user.status === "active"
                          ? "bg-[#D4EDDA] text-[#155724] border-[#155724]"
                          : user.status === "banned"
                          ? "bg-[#F8D7DA] text-[#721C24] border-[#721C24]"
                          : "bg-[#e8e6e0] text-[#999] border-[#ccc]"
                      }`}>
                      {user.status || "unknown"}
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
    </div>
  );
}