"use client";

export function FilterGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-2 py-1 rounded-md border-2 transition-colors ${
              active
                ? "bg-[#222] text-white border-[#222] shadow-[2px_2px_0_#222]"
                : "border-transparent text-[#666] hover:text-[#222] hover:bg-[#e8e6e0]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
