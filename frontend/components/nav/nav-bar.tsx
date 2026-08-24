"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { neoBtnSm } from "@/lib/styles";
import { LangMenu } from "./lang-menu";
import { CartFlyout } from "./cart-flyout";
import { AccountMenu } from "./account-menu";

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
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: session, status } = useSession();
  const wasAuth = useRef(false);

  useEffect(() => {
    if (status === "authenticated") wasAuth.current = true;
    if (status === "unauthenticated" && wasAuth.current) router.push("/");
  }, [status, router]);

  const token = (session as any)?.accessToken;
  const currentUser = user ?? session?.user ?? null;

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
          <LangMenu />
          {currentUser && (
            <div className="relative" onMouseEnter={() => setNotifOpen(true)} onMouseLeave={() => setNotifOpen(false)}>
              <button
                type="button"
                aria-label={t("nav.notifications")}
                className="flex items-center justify-center w-9 h-9 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6]"
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
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-50 pt-2">
                  <div className="w-72 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
                    <div className="px-4 py-3 border-b-[3px] border-[#222]">
                      <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
                        {t("nav.notifications")}
                      </p>
                    </div>
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-bold text-[#999]">{t("nav.noNotifications")}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {currentUser && <CartFlyout token={token} />}
          {currentUser ? (
            <AccountMenu user={currentUser} token={token} />
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

        <button type="button" aria-label={t("nav.menu")} className="md:hidden shrink-0 ml-4" onClick={() => setOpen(!open)}>
          {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
        </button>
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
