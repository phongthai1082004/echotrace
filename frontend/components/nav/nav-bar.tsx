"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { neoBtnSm } from "@/lib/styles";
import { apiFetch } from "@/lib/api.fetch";
import { LangMenu } from "./lang-menu";
import { CartFlyout } from "./cart-flyout";
import { AccountMenu } from "./account-menu";
import { useNotifStore, useUnreadCount, notifText, type NotifItem } from "@/stores/notifications";
import logoImg from "@/assets/images/Logo.png";

interface NavProps {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
}

function XIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function MenuIcon({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
    </svg>
  );
}

export function Nav({ user }: NavProps) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menu, setMenu] = useState<{ id: number | string; x: number; y: number } | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const { data: session, status } = useSession();
  const wasAuth = useRef(false);

  useEffect(() => {
    if (status === "authenticated") wasAuth.current = true;
    if (status === "unauthenticated" && wasAuth.current) router.push("/");
  }, [status, router]);

  const token = (session as any)?.accessToken;
  const currentUser = user ?? session?.user ?? null;

  const items = useNotifStore((s) => s.items);
  const unread = useUnreadCount();
  const loadMore = useNotifStore((s) => s.loadMore);
  const loadingMore = useNotifStore((s) => s.loadingMore);

  // ponytail: list do store giữ (bootstrap nạp đầu + SSE đẩy live) — đây chỉ poll backup 60s.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      void useNotifStore.getState().refresh();
    }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openNotif = async (n: any) => {
    setNotifOpen(false);
    // ponytail: tin live id tạm (string) không có trên DB — chỉ đánh dấu local
    if (!n.isRead && typeof n.id === "number" && token) {
      try {
        await apiFetch(`/api/notifications/${n.id}/read`, token, { method: "PATCH" });
      } catch {}
    }
    if (!n.isRead) useNotifStore.getState().setRead(n.id);
    router.push(n.metadata?.actionUrl || "/orders");
  };

  // ponytail: menu fixed theo viewport (thoát khung scroll của dropdown)
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, n: NotifItem) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu(menu?.id === n.id ? null : { id: n.id, x: Math.max(8, r.right - 190), y: r.bottom + 6 });
  };

  const setFlag = async (n: NotifItem, read: boolean) => {
    setMenu(null);
    if (typeof n.id === "number" && token) {
      try {
        await apiFetch(`/api/notifications/${n.id}/${read ? "read" : "unread"}`, token, {
          method: "PATCH",
        });
      } catch {}
    }
    useNotifStore.getState()[read ? "setRead" : "setUnread"](n.id);
  };

  useEffect(() => {
    if (!open || !token) return;
    apiFetch<any>("/api/cart", token)
      .then((d) => {
        const items: any[] = d?.parsedItems ?? [];
        setCartCount(items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0));
      })
      .catch(() => {});
  }, [open, token]);

  const logout = async () => {
    if (token) {
      await apiFetch("/api/auth/logout", token, { method: "POST" }).catch(() => {});
    }
    const { withLang, langFromPath } = await import("@/lib/routing");
    signOut({ callbackUrl: withLang("/", langFromPath(pathname)) });
  };

  if (pathname === "/auth" || pathname.match(/^\/(en|vi|es)\/auth$/)) return null;

  const links = [
    { href: "/explore", label: t("nav.explore") },
    { href: "/my-journals", label: t("nav.myJournals") },
    { href: "/orders", label: t("nav.orders") },
  ];

  return (
    <nav suppressHydrationWarning className="fixed top-0 left-0 right-0 z-40 bg-[#F8F2E5] border-b-[3px] border-[#222]">
      <div className="flex items-center justify-between px-4 sm:px-8 h-15">
        <div className="flex items-center gap-10">
          <Link href="/" suppressHydrationWarning className="flex items-center gap-2 shrink-0 leading-none">
            <Image src={logoImg} alt="Better Memoire" style={{ height: 32, width: "auto" }} priority />
            <span className="font-bold text-base tracking-tight">{t("brand")}</span>
          </Link>
          {token && (
            <div className="hidden md:flex items-center gap-6">
              {links.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    suppressHydrationWarning
                    className={`font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-[6px] transition-[background-color,color] leading-none ${
                      active ? "bg-[#222] text-white" : "text-[#666] hover:bg-[#e8e6e0] hover:text-[#222]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LangMenu />
          {currentUser && (
            <button type="button" aria-label={t("nav.menu")} className="md:hidden shrink-0" onClick={() => setOpen(!open)}>
              {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
            </button>
          )}
          {currentUser && (
            <div className="hidden md:contents">
            <div className="relative" onMouseEnter={() => { setNotifOpen(true); void useNotifStore.getState().refresh(); }} onMouseLeave={() => { if (!menu) setNotifOpen(false); }}>
              <button
                type="button"
                aria-label={t("nav.notifications")}
                className="relative flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#222]"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#B54843] text-white font-mono text-[8px] font-bold flex items-center justify-center leading-none">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-50 pt-2">
                    <div
                      className="w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden"
                      onScroll={(e) => {
                        setMenu(null);
                        const el = e.currentTarget;
                        // ponytail: cursor append khi scroll gần đáy
                        if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) void loadMore();
                      }}
                    >
                    <div className="px-4 py-3 border-b-[3px] border-[#222] sticky top-0 bg-[#FFF7D6]">
                      <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
                        {t("nav.notifications")}
                      </p>
                    </div>
                    {items.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm font-bold text-[#999]">{loadingMore ? "…" : t("nav.noNotifications")}</p>
                      </div>
                    ) : (
                      items.map((n: any) => (
                        <div
                          key={n.id}
                          className={`relative px-4 py-3 border-b-2 border-[#222]/10 last:border-b-0 transition-colors ${
                            n.isRead ? "" : "bg-white"
                          }`}
                        >
                          <button type="button" onClick={() => openNotif(n)} className="w-full text-left">
                            <div className="flex items-center gap-2">
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#B54843] shrink-0" />}
                              <p className="text-sm font-bold leading-tight flex-1">{notifText(n, "title", i18n.language)}</p>
                            </div>
                            <p className="text-xs text-[#666] line-clamp-2 mt-0.5">
                              {notifText(n, "message", i18n.language).replace(/<[^>]*>/g, "")}
                            </p>
                            <p className="font-mono text-[8px] text-[#999] mt-1">
                              {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                            </p>
                          </button>
                          <span className="absolute inset-y-0 right-2 flex items-center">
                            <button
                              type="button"
                              aria-label="…"
                              onClick={(e) => openMenu(e, n)}
                              className="w-7 h-7 rounded-[8px] border-[3px] border-[#222] bg-[#FFF7D6] font-bold text-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] leading-none"
                            >
                              …
                            </button>
                          </span>
                        </div>
                      )))
                    }
                  </div>
                </div>
              )}
            </div>
            </div>
          )}
          {currentUser && (
            <div className="hidden md:contents">
              <CartFlyout token={token} />
            </div>
          )}
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
              <div
                className="fixed z-50 bg-white rounded-lg border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden w-48"
                style={{ top: menu.y, left: menu.x }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const n = items.find((i) => i.id === menu.id);
                    if (n) void setFlag(n, true);
                  }}
                  className="block w-full text-left px-4 py-2 text-xs font-bold hover:bg-[#FFF7D6]"
                >
                  {t("nav.markRead")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const n = items.find((i) => i.id === menu.id);
                    if (n) void setFlag(n, false);
                  }}
                  className="block w-full text-left px-4 py-2 text-xs font-bold border-t-2 border-[#222]/10 hover:bg-[#FFF7D6]"
                >
                  {t("nav.markUnread")}
                </button>
              </div>
            </>
          )}
          {currentUser ? (
            <div className="hidden md:contents">
              <AccountMenu user={currentUser} token={token} />
            </div>
          ) : (
            <Link
              href="/auth"
              suppressHydrationWarning
              className={`${neoBtnSm} font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2`}
            >
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t-[3px] border-[#222] bg-[#FFF7D6]">
          {token &&
            links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                suppressHydrationWarning
                onClick={() => setOpen(false)}
                className="block font-mono text-[10px] font-bold tracking-widest uppercase px-8 py-3 hover:bg-[#222] hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          {token && (
            <>
              <div className="mx-2 h-[2px] bg-[#222]/10" />
              <Link
                href="/checkout"
                suppressHydrationWarning
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 font-mono text-[10px] font-bold tracking-widest uppercase px-8 py-3 hover:bg-[#222] hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {t("nav.cart", { count: cartCount })}
              </Link>
              <Link
                href="/account"
                suppressHydrationWarning
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 font-mono text-[10px] font-bold tracking-widest uppercase px-8 py-3 hover:bg-[#222] hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {t("nav.account")}
              </Link>
              <button
                type="button"
                suppressHydrationWarning
                onClick={logout}
                className="flex items-center gap-2.5 w-full text-left font-mono text-[10px] font-bold tracking-widest uppercase px-8 py-3 hover:bg-[#222] hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {t("nav.signOut")}
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
