"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { card } from "@/lib/styles";

interface NeoSelectOption {
  value: string;
  label: React.ReactNode;
  keywords?: string;
  color?: string;
  style?: CSSProperties;
}

interface NeoSelectProps {
  options: NeoSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function NeoSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className = "",
  searchable = false,
  searchPlaceholder = "Search…",
}: NeoSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const visible = searchable
    ? options.filter((o) =>
        (o.keywords ?? (typeof o.label === "string" ? o.label : "")).toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen((o) => !o);
        }}
        className={`${card} w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#222] transition-[transform,box-shadow] cursor-pointer`}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-2" style={selected.style}>
              {selected.color && <span className={`w-2 h-2 rounded-full shrink-0 ${selected.color}`} />}
              {selected.label}
            </span>
          ) : (
            <span className="text-[#999]">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-[#999] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-y-auto"
          style={{ maxHeight: "12.5rem" }}
        >
          {searchable && (
            <div className="sticky top-0 bg-[#FFF7D6] p-1.5 border-b-2 border-[#222]/10">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-xs font-bold px-2 py-1.5 rounded-md border-2 border-[#222] bg-white placeholder:text-[#999] focus:outline-none shadow-none!"
              />
            </div>
          )}
          {visible.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-left transition-[background-color] cursor-pointer ${
                opt.value === value ? "bg-[#222] text-white" : "hover:bg-[#222]/10 text-[#222]"
              }`}
              style={opt.style}
            >
              {opt.color && (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${opt.color} ${opt.value === value ? "border border-white" : ""}`}
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
