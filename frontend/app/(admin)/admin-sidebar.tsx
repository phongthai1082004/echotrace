"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { BarChart3, DollarSign, TrendingUp, Package, Truck, Users, Sticker, UserCircle, LogOut } from "lucide-react";

const nav = [
  { href: "/admin/analytics", label: "Overview", icon: BarChart3 },
  { href: "/admin/finance", label: "Finance", icon: DollarSign },
  { href: "/admin/marketing", label: "Marketing", icon: TrendingUp },
  { href: "/admin/dispatch", label: "Dispatch", icon: Package },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/stickers", label: "Assets", icon: Sticker },
  { href: "/admin/account", label: "Account", icon: UserCircle },
];

export function AdminSidebar() {
  const path = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed top-0 left-0 w-56 h-screen bg-[#FFF7D6] border-r-[3px] border-[#222] flex flex-col">
      <div className="p-5 border-b-[3px] border-[#222]">
        <p className="font-bold text-lg">Cabinet Memoir</p>
        <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999] mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 text-sm font-bold px-3 py-2.5 rounded-lg transition-all ${
                active ? "bg-[#222] text-white border-2 border-[#222] shadow-[2px_2px_0_#222]" : "text-[#222] hover:bg-[#e8e6e0] border-2 border-transparent"
              }`}>
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t-[3px] border-[#222] space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-md bg-[#222] text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
            {session?.user?.image ? (
              <img src={cloudinaryUrl(session.user.image)} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              session?.user?.email?.charAt(0).toUpperCase() || "?"
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{session?.user?.name || "Admin"}</p>
            <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999] truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/auth" })}
          className="flex items-center gap-2.5 w-full text-sm font-bold px-3 py-2.5 rounded-lg transition-all text-[#B54843] hover:bg-[#B54843]/10 border-2 border-transparent hover:border-[#B54843]">
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
