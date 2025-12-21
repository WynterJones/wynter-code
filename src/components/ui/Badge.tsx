import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          {
            default: "bg-bg-hover text-text-secondary",
            success: "bg-accent-green/20 text-accent-green",
            warning: "bg-accent-yellow/20 text-accent-yellow",
            error: "bg-accent-red/20 text-accent-red",
            info: "bg-accent-blue/20 text-accent-blue",
          }[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
