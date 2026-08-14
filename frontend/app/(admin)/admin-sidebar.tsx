"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { cloudinaryUrl } from "@echotrace/shared";
import { BarChart3, DollarSign, TrendingUp, Package, Truck, Users, Sticker, UserCircle, Bell, BookOpen, LogOut, X, BellDot } from "lucide-react";

export function AdminSidebar() {
  const { t } = useTranslation();
  const rawPath = usePathname();
  const path = rawPath.replace(/^\/[a-z]{2}(?=\/)/, "");
  const router = useRouter();
  const { data: session, status } = useSession();
  const wasAuth = useRef(false);
  const [notifOpen, setNotifOpen] = useState(false);
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
    { href: "/admin/coupons", label: t("admin.sidebar.coupons"), icon: TrendingUp },
    { href: "/admin/sample-books", label: t("admin.sidebar.sampleBooks"), icon: BookOpen },
    { href: "/admin/account", label: t("admin.sidebar.account"), icon: UserCircle },
    { href: "#", label: t("admin.sidebar.notifications"), icon: Bell, notify: true },
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
        {nav.map(({ href, label, icon: Icon, notify }) => {
          const active = !notify && (href === "/admin/analytics" ? path === href || path === "/admin" : path.startsWith(href));
          const btnClass = `flex items-center gap-2.5 w-full text-sm max-[1600px]:text-xs max-[1280px]:justify-center max-[1280px]:px-2 font-bold px-3 py-2.5 max-[1600px]:py-2 rounded-lg transition-all border-2 ${
            active
              ? "bg-[#222] text-white border-[#222] shadow-[2px_2px_0_#222]"
              : "text-[#222] hover:bg-[#e8e6e0] border-transparent hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,0.1)]"
          }`;
          return notify ? (
            <button key={label} onClick={() => setNotifOpen(true)}
              className={btnClass}>
              <Icon size={14} className="shrink-0" />
              <span className="max-[1280px]:hidden" suppressHydrationWarning>{label}</span>
            </button>
          ) : (
            <Link key={href} href={href} className={btnClass}>
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
              <Image src={cloudinaryUrl(session.user.image)} alt="" width={28} height={28} className="object-cover" />
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
          className="flex items-center gap-2.5 max-[1280px]:justify-center w-full text-sm max-[1600px]:text-xs font-bold px-3 py-2.5 max-[1600px]:py-2 rounded-lg transition-all text-[#B54843] bg-[#FFF7D6] hover:bg-[#B54843] hover:text-white border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222]">
          <LogOut size={14} />
          <span className="max-[1280px]:hidden" suppressHydrationWarning>{t("nav.signOut")}</span>
        </button>
      </div>

      {/* Notifications panel */}
      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setNotifOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]" style={{ width: 380 }}>
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div className="flex items-center gap-3">
                <BellDot size={18} />
                <h2 className="text-lg font-bold">{t("admin.sidebar.notifications")}</h2>
              </div>
              <button onClick={() => setNotifOpen(false)} className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222] hover:translate-x-px hover:translate-y-[1px] transition-[transform,background-color]"><X size={16} /></button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm font-bold text-[#999]">{t("admin.comingSoon")}</p>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
