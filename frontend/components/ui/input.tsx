import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-[#FFF7D6] text-[14px] font-bold text-[#222] px-3 py-2.5 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
