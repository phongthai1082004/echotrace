"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { neoBtnSm, neoBtnPrimarySm } from "@/lib/styles";

function FlagUk() {
  return (
    <svg viewBox="0 0 60 30" className="w-4 h-3 rounded-sm shrink-0">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#FFF" strokeWidth="6" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0v30M0 15h60" stroke="#FFF" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="4" />
    </svg>
  );
}

function FlagVn() {
  return (
    <svg viewBox="0 0 30 20" className="w-4 h-3 rounded-sm shrink-0">
      <rect width="30" height="20" fill="#DA251D" />
      <polygon points="15,2 17.5,8 24,8 19,12 20.5,18 15,14 9.5,18 11,12 6,8 12.5,8" fill="#FFFF00" />
    </svg>
  );
}

function FlagEs() {
  return (
    <svg viewBox="0 0 30 20" className="w-4 h-3 rounded-sm shrink-0">
      <rect width="30" height="20" fill="#C60B1E" />
      <rect y="4" width="30" height="12" fill="#FFC400" />
      <rect y="4" width="30" height="1.5" fill="#C60B1E" />
      <rect y="14.5" width="30" height="1.5" fill="#C60B1E" />
    </svg>
  );
}

const langs = [
  { code: "en", label: "EN", Flag: FlagUk },
  { code: "vi", label: "VI", Flag: FlagVn },
  { code: "es", label: "ES", Flag: FlagEs },
];

export function LanguageSwitcher({ compact, inline }: { compact?: boolean; inline?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = langs.find((l) => i18n.language.startsWith(l.code)) || langs[0];

  if (inline) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {langs.map((l) => {
          const active = i18n.language.startsWith(l.code);
          return (
            <button
              key={l.code}
              onClick={() => {
                localStorage.setItem("i18nextLng", l.code);
                i18n.changeLanguage(l.code);
              }}
              className={`flex items-center gap-2 w-full text-left font-mono font-bold tracking-wider text-[10px] px-3 py-2.5 rounded-[6px] ${
                active ? neoBtnPrimarySm : `${neoBtnSm} text-[#666] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer`
              }`}
            >
              <l.Flag />
              <span className="flex-1 text-left">{l.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`flex items-center gap-1.5 font-mono font-bold tracking-wider leading-none transition-colors ${
          compact ? "text-[9px] px-1.5 py-1 rounded-[4px]" : "text-[10px] px-2 py-1.5 rounded-[4px] hover:bg-[#e8e6e0]"
        }`}
      >
        <current.Flag />
        <span className={compact ? "hidden" : ""}>{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 pt-1.5">
          <div className="min-w-[90px] bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  localStorage.setItem("i18nextLng", l.code);
                  i18n.changeLanguage(l.code);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 font-mono text-[10px] font-bold tracking-wider transition-colors ${
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
