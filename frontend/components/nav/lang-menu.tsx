"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FlagEs, FlagUk, FlagVn } from "./flags";

export function LangMenu() {
  const { i18n, t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // ponytail: disable on studio page
  if (pathname?.includes("studio")) return null;

  const langs = [
    { code: "en", label: "EN", Flag: FlagUk },
    { code: "vi", label: "VI", Flag: FlagVn },
    { code: "es", label: "ES", Flag: FlagEs },
  ];

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={t("nav.language")}
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
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 pt-2">
          <div className="min-w-[100px] bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={async () => {
                  document.cookie = `i18nextLng=${l.code}; path=/`;
                  await i18n.changeLanguage(l.code);
                  router.push(`/${l.code}${pathname.replace(/^\/(en|vi|es)/, "")}`);
                  setOpen(false);
                }}
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
  );
}
