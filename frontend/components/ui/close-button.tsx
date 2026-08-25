"use client";

import { X } from "lucide-react";
import { neoBtn } from "@/lib/styles";

export function CloseButton({
  onClick,
  size = 16,
  className = "",
}: {
  onClick: () => void;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className={`${neoBtn} p-1.5 cursor-pointer shrink-0 ${className}`}
    >
      <X size={size} />
    </button>
  );
}