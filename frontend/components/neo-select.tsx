"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { card } from "@/lib/styles";

interface NeoSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface NeoSelectProps {
  options: NeoSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function NeoSelect({ options, value, onChange, placeholder = "Select…", className = "" }: NeoSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

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
        onClick={() => setOpen((o) => !o)}
        className={`${card} w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#222] transition-[transform,box-shadow] cursor-pointer`}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-2">
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
          {options.map((opt) => (
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
