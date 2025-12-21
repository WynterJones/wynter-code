import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            default: "bg-bg-tertiary text-text-primary hover:bg-bg-hover border border-border",
            primary: "bg-accent text-bg-primary hover:bg-accent/90",
            ghost: "hover:bg-bg-hover text-text-primary",
            outline:
              "border border-border bg-transparent hover:bg-bg-hover text-text-primary",
            danger: "bg-accent-red text-white hover:bg-accent-red/90",
          }[variant],
          {
            sm: "h-7 px-2 text-xs rounded",
            md: "h-8 px-3 text-sm rounded-md",
            lg: "h-10 px-4 text-base rounded-md",
            icon: "h-8 w-8 rounded-md",
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
