import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label for screen readers - required for icon-only buttons */
  "aria-label"?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "ghost" | "outline" | "danger" | "secondary";
}

const variantStyles = {
  default: "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
  primary: "text-accent hover:text-accent hover:bg-accent/10",
  secondary: "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-transparent",
  outline: "border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover",
  danger: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", variant = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          {
            sm: "h-6 w-6",
            md: "h-8 w-8",
            lg: "h-10 w-10",
          }[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
