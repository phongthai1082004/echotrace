"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api.fetch";

type NavUser = { name?: string | null; email?: string | null; image?: string | null };

export function AccountMenu({ user, token }: { user: NavUser; token?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    if (token) {
      await apiFetch("/api/auth/logout", token, { method: "POST" }).catch(() => {});
    }
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={user.name || user.email || t("nav.account")}
        className="flex items-center gap-2.5 h-9 px-3 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6]"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={28}
            height={28}
            className="h-[calc(100%-6px)] w-auto rounded-full object-contain"
          />
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

      {open && (
        <div className="absolute right-0 top-full z-50 pt-2">
          <div className="w-44 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
            <Link
              href="/account"
              suppressHydrationWarning
              className="flex items-center gap-2.5 w-full text-left font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors border-b-[3px] border-[#222]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {t("nav.account")}
            </Link>
            <button
              type="button"
              suppressHydrationWarning
              onClick={logout}
              className="flex items-center gap-2.5 w-full text-left font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 hover:bg-[#222] hover:text-white transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
