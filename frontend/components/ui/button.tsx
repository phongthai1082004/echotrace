import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-[#0D1F1A] text-[#FDFBF7] hover:bg-[#1a1a1a]",
  secondary: "hover:bg-[#f5f3ef] border border-[#dbdad6]",
  ghost: "hover:bg-[#f5f3ef]",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase transition-colors duration-150 disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
