"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { cloudinaryUrl } from "@echotrace/shared";
import { apiFetch } from "@/lib/api.fetch";

function itemThumb(item: any): string | null {
  return item.thumbnailUrl ?? item.coverUrl ?? null;
}

function FlagUk() {
  return (
    <svg viewBox="0 0 60 30" className="w-4 h-3 rounded-sm shrink-0">
      <rect width="60" height="30" fill="#012169"/>
      <path d="M0 0l60 30m0-30L0 30" stroke="#FFF" strokeWidth="6"/>
      <path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" strokeWidth="3"/>
      <path d="M30 0v30M0 15h60" stroke="#FFF" strokeWidth="10"/>
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="4"/>
    </svg>
  );
}
function FlagVn() {
  return (
    <svg viewBox="0 0 30 20" className="w-4 h-3 rounded-sm shrink-0">
      <rect width="30" height="20" fill="#DA251D"/>
      <polygon points="15,2 17.5,8 24,8 19,12 20.5,18 15,14 9.5,18 11,12 6,8 12.5,8" fill="#FFFF00"/>
    </svg>
  );
}
function FlagEs() {
  return (
    <svg viewBox="0 0 30 20" className="w-4 h-3 rounded-sm shrink-0">
      <rect width="30" height="20" fill="#C60B1E"/>
      <rect y="4" width="30" height="12" fill="#FFC400"/>
      <rect y="4" width="30" height="1.5" fill="#C60B1E"/>
      <rect y="14.5" width="30" height="1.5" fill="#C60B1E"/>
    </svg>
  );
}

interface NavProps {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
}

export function Nav({ user }: NavProps) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: session, status } = useSession();
  const wasAuth = useRef(false);
  useEffect(() => {
    if (status === "authenticated") wasAuth.current = true;
    if (status === "unauthenticated" && wasAuth.current) router.push("/");
  }, [status, router]);

  const token = (session as any)?.accessToken;

  if (pathname === "/auth" || pathname.match(/^\/(en|vi|es)\/auth$/)) return null;

  const langs = [
    { code: "en", label: "EN", Flag: FlagUk },
    { code: "vi", label: "VI", Flag: FlagVn },
    { code: "es", label: "ES", Flag: FlagEs },
  ];
  const currentLang = langs.find((l) => i18n.language.startsWith(l.code)) || langs[0];

  const links = [
    { href: "/explore", label: t("nav.explore") },
    { href: "/my-journals", label: t("nav.myJournals") },
    { href: "/orders", label: t("nav.orders") },
  ];

  return (
    <nav suppressHydrationWarning className="fixed top-0 left-0 right-0 z-40 bg-[#F8F2E5] border-b-[3px] border-[#222]">
      <div className="flex items-center justify-between px-4 sm:px-8 h-15">
        <div className="flex items-center gap-10">
          <Link href="/" suppressHydrationWarning className="font-bold text-base tracking-tight shrink-0 leading-none">
            {t("brand")}
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
          <div className="relative" onMouseEnter={() => setLangOpen(true)} onMouseLeave={() => setLangOpen(false)}>
            <button type="button" className="flex items-center justify-center w-9 h-9 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#222]"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full z-50 pt-2">
                <div className="min-w-[100px] bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
                  {langs.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { i18n.changeLanguage(l.code); router.push(`/${l.code}${pathname.replace(/^\/(en|vi|es)/, "")}`); setLangOpen(false); }}
                      className={`flex items-center gap-2 w-full text-left px-3 py-2.5 font-mono text-[10px] font-bold tracking-wider transition-colors ${
                        i18n.language.startsWith(l.code) ? "bg-[#222] text-white" : "hover:bg-[#e8e6e0]"
                      }`}
                    >
                      <l.Flag />
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {user && (
            <div className="relative"
              onMouseEnter={() => setNotifOpen(true)}
              onMouseLeave={() => setNotifOpen(false)}>
              <button type="button"
                className="flex items-center justify-center w-9 h-9 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#222]">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-50 pt-2">
                  <div className="w-72 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
                    <div className="px-4 py-3 border-b-[3px] border-[#222]">
                      <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">{t("nav.notifications")}</p>
                    </div>
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-bold text-[#999]">{t("nav.noNotifications")}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {user && (
            <div className="relative"
              onMouseEnter={() => {
                setCartOpen(true);
                if (token) {
                  apiFetch<any>("/api/cart", token)
                    .then((d) => {
                      const items: any[] = d?.parsedItems ?? [];
                      setCartItems(items);
                      setCartCount(items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0));
                    })
                    .catch(() => {});
                }
              }}
              onMouseLeave={() => setCartOpen(false)}>
              <button type="button" className="relative flex items-center justify-center w-9 h-9 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#222]">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#222] text-white font-mono text-[7px] font-bold flex items-center justify-center leading-none">{cartCount > 9 ? "9+" : cartCount}</span>
                )}
              </button>

              {cartOpen && (
                <div className="absolute right-0 top-full z-50 pt-2">
                  <div className="w-72 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
                    <div className="px-4 py-3">
                      <p suppressHydrationWarning className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">{t("nav.cart", { count: cartCount })}</p>
                    </div>
                    <div className="border-t-[3px] border-[#222]">
                      {cartItems.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <p suppressHydrationWarning className="font-mono text-[10px] text-[#999]">{t("nav.cartEmpty")}</p>
                        </div>
                      ) : (
                        <div className="max-h-[280px] overflow-y-auto">
                          {cartItems.slice(0, 5).map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 border-t-[3px] border-[#222]">
                              <div className="w-10 h-12 bg-[#e8e6e0] rounded-[8px] border-2 border-[#222] shrink-0 overflow-hidden">
                                {itemThumb(item) && <img src={itemThumb(item)!} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p suppressHydrationWarning className="text-sm font-bold leading-tight truncate">{item.title}</p>
                                <p suppressHydrationWarning className="font-mono text-[9px] text-[#999] mt-0.5">{item.cover === "softcover" ? "Softcover" : item.cover} · {item.pages} pg</p>
                              </div>
                              <p suppressHydrationWarning className="font-mono text-[10px] font-bold shrink-0">x{item.quantity || 1}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link href="/checkout"
                      suppressHydrationWarning
                      className="block w-full text-center border-t-[3px] border-[#222] font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors">
                      {t("nav.viewCart")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
          {user ? (
            <div
              className="relative"
              onMouseEnter={() => setDropdown(true)}
              onMouseLeave={() => setDropdown(false)}
            >
              <button
                type="button"
                className="flex items-center gap-2.5 h-9 px-3 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6]"
              >
                {user.image ? (
                  <Image src={cloudinaryUrl(user.image)} alt="" width={28} height={28} className="rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#222] flex items-center justify-center shrink-0 overflow-hidden">
                    <span className="font-mono text-[10px] font-bold text-white leading-none">
                      {user.name?.charAt(0).toLocaleUpperCase() || user.email?.charAt(0).toLocaleUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <span suppressHydrationWarning className="text-sm font-bold leading-none">
                  {user.name || user.email || t("nav.user")}
                </span>
              </button>

              {dropdown && (
                <div className="absolute right-0 top-full z-50 pt-2">
                  <div className="w-44 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
                    <Link
                      href="/account"
                      suppressHydrationWarning
                      className="flex items-center gap-2.5 w-full text-left font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors border-b-[3px] border-[#222]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {t("nav.account")}
                    </Link>
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={async () => {
                        if (token) {
                          await apiFetch("/api/auth/logout", token, { method: "POST" }).catch(() => {});
                        }
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex items-center gap-2.5 w-full text-left font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      {t("nav.signOut")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              suppressHydrationWarning
              className="font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] bg-[#FFF7D6] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow]"
            >
               {t("nav.signIn")}
            </Link>
          )}
        </div>

        <button className="md:hidden shrink-0 ml-4" onClick={() => setOpen(!open)}>
          {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t-[3px] border-[#222] bg-[#FFF7D6]">
          {token && links.map((link) => (
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
          {!token && (
          <Link
            href="/auth"
            suppressHydrationWarning
            onClick={() => setOpen(false)}
            className="block font-mono text-[10px] font-bold tracking-widest uppercase px-8 py-3 hover:bg-[#222] hover:text-white transition-colors"
          >
            {t("nav.signIn")}
          </Link>
          )}
        </div>
      )}
    </nav>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

function MenuIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>
    </svg>
  );
}
