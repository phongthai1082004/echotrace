import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-transparent font-['Inter'] text-[14px] text-[#1a1a1a] pb-2 placeholder:text-[#1a1a1a]/25 focus:outline-none",
        "border-b border-[#dbdad6] focus:border-[#1a1a1a] transition-colors",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
