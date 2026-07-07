import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cn("w-full", className)} {...props} />
  ),
);
Table.displayName = "Table";

export const THead = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("border-b border-[#dbdad6]", className)} {...props} />
  ),
);
THead.displayName = "THead";

export const Th = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "text-left px-6 py-3 font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase text-[rgba(26,26,26,0.3)]",
        className,
      )}
      {...props}
    />
  ),
);
Th.displayName = "Th";

export const Tr = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("hover:bg-[#f5f3ef] transition-colors border-b border-[#dbdad6]", className)}
      {...props}
    />
  ),
);
Tr.displayName = "Tr";

export const Td = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-6 py-4", className)} {...props} />
  ),
);
Td.displayName = "Td";
