"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { BarChart3, DollarSign, TrendingUp, Package, Truck, Users, Sticker, UserCircle, LogOut } from "lucide-react";

export function AdminSidebar() {
  const { t } = useTranslation();
  const path = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const wasAuth = useRef(false);
  useEffect(() => {
    if (status === "authenticated") wasAuth.current = true;
    if (status === "unauthenticated" && wasAuth.current) router.push("/");
  }, [status, router]);

  const nav = [
    { href: "/admin/analytics", label: t("admin.sidebar.overview"), icon: BarChart3 },
    { href: "/admin/finance", label: t("admin.sidebar.finance"), icon: DollarSign },
    { href: "/admin/marketing", label: t("admin.sidebar.marketing"), icon: TrendingUp },
    { href: "/admin/dispatch", label: t("admin.sidebar.dispatch"), icon: Package },
    { href: "/admin/suppliers", label: t("admin.sidebar.suppliers"), icon: Truck },
    { href: "/admin/users", label: t("admin.sidebar.users"), icon: Users },
    { href: "/admin/stickers", label: t("admin.sidebar.assets"), icon: Sticker },
    { href: "/admin/account", label: t("admin.sidebar.account"), icon: UserCircle },
  ];

  return (
    <aside className="fixed top-0 left-0 w-56 max-[1600px]:w-45 max-[1280px]:w-16 h-screen bg-[#FFF7D6] border-r-[3px] border-[#222] flex flex-col transition-all duration-200 z-30">
      <div className="p-5 max-[1600px]:p-4 max-[1280px]:p-3 border-b-[3px] border-[#222]">
        <p className="font-bold text-lg max-[1600px]:text-base max-[1280px]:text-xs max-[1280px]:text-center">
          <span className="max-[1280px]:hidden" suppressHydrationWarning>{t("brand")}</span>
          <span className="hidden max-[1280px]:inline" suppressHydrationWarning>{t("brandShort")}</span>
        </p>
        <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999] mt-0.5 max-[1280px]:hidden" suppressHydrationWarning>{t("admin.panel")}</p>
      </div>

      <nav className="flex-1 p-3 max-[1600px]:p-2 max-[1280px]:p-1.5 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 text-sm max-[1600px]:text-xs max-[1280px]:justify-center max-[1280px]:px-2 font-bold px-3 py-2.5 max-[1600px]:py-2 rounded-lg transition-all ${
                active ? "bg-[#222] text-white border-2 border-[#222] shadow-[2px_2px_0_#222]" : "text-[#222] hover:bg-[#e8e6e0] border-2 border-transparent"
              }`}>
              <Icon size={14} className="shrink-0" />
              <span className="max-[1280px]:hidden" suppressHydrationWarning>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 max-[1600px]:p-2 max-[1280px]:p-1.5 space-y-1">
        <div className="flex items-center gap-2.5 max-[1280px]:justify-center px-3 py-2 max-[1600px]:px-2 max-[1280px]:px-1">
          <div className="w-7 h-7 rounded-md bg-[#222] text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
            {session?.user?.image ? (
              <img src={cloudinaryUrl(session.user.image)} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              session?.user?.email?.charAt(0).toUpperCase() || "?"
            )}
          </div>
          <div className="min-w-0 max-[1280px]:hidden">
            <p className="text-sm font-bold truncate" suppressHydrationWarning>{session?.user?.name || t("admin.fallback.admin")}</p>
            <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999] truncate" suppressHydrationWarning>{session?.user?.email}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2.5 max-[1280px]:justify-center w-full text-sm max-[1600px]:text-xs font-bold px-3 py-2.5 max-[1600px]:py-2 rounded-lg transition-all text-[#B54843] hover:bg-[#B54843]/10 border-2 border-transparent hover:border-[#B54843]">
          <LogOut size={14} />
          <span className="max-[1280px]:hidden" suppressHydrationWarning>{t("nav.signOut")}</span>
        </button>
      </div>
    </aside>
  );
}
