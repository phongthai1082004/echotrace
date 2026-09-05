"use client";

import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function AdminSearch({ value, onChange, placeholder }: Props) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-3 w-full lg:w-72 shrink-0">
      <Search size={13} className="text-[#999] shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search…"}
        className="flex-1 text-sm font-bold py-2 placeholder:text-[#999] focus:outline-none bg-transparent"
      />
      {value && (
        <button onClick={() => onChange("")} className="opacity-40 hover:opacity-70">
          <X size={12} />
        </button>
      )}
    </div>
  );
}
