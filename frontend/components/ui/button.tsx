import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-[#222] text-white border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]",
  secondary: "bg-[#FFF7D6] text-[#222] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]",
  ghost: "hover:bg-[#e8e6e0] rounded-[8px]",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "font-mono text-[10px] font-bold tracking-widest uppercase rounded-[8px] transition-all duration-150 disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
