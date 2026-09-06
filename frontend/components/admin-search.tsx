"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function AdminSearch({ value, onChange, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Esc clears, / focuses from anywhere on the page (standard admin UX)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = inputRef.current;
      if (!el) return;
      if (e.key === "Escape" && document.activeElement === el) {
        onChange("");
        el.blur();
      }
      if (e.key === "/" && document.activeElement !== el && !(document.activeElement instanceof HTMLInputElement) && !(document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        el.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  return (
    <div
      className={`flex items-center gap-2 bg-white rounded-[10px] border-2 border-[#222] px-3 w-full lg:w-72 shrink-0 transition-[transform,box-shadow] ${
        value
          ? "shadow-[3px_3px_0_#222] border-b-4"
          : "shadow-[2px_2px_0_#222] focus-within:translate-x-px focus-within:translate-y-px focus-within:shadow-[1px_1px_0_#222]"
      }`}
    >
      <Search size={13} className="text-[#999] shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search…"}
        aria-label={placeholder || "Search"}
        className="flex-1 min-w-0 text-sm font-bold py-2 bg-transparent border-none! shadow-none! focus:outline-none focus:shadow-none! placeholder:text-[#999]"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md border-2 border-[#222] bg-[#FFF7D6] hover:bg-[#e8e6e0] transition-colors"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
